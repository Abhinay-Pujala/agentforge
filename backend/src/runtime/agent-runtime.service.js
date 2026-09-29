import { buildPrompt } from "./prompt-builder.js";
import { normalizeModelResponse } from "./model-response.js";
import ToolExecutionService from "../tools/tool-execution.service.js";

const DEFAULT_MAX_TOOL_ROUNDS = 5;

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function inferWorkflowForInput(workflowCatalog, input) {
  if (!Array.isArray(workflowCatalog) || workflowCatalog.length === 0) {
    return null;
  }

  const inputTokens = new Set(tokenize(input));

  const ranked = workflowCatalog
    .map((workflow) => {
      const searchable = [
        workflow.name,
        workflow.description,
        workflow.category,
      ]
        .filter(Boolean)
        .join(" ");

      const matchedTokens = tokenize(searchable).filter((token) =>
        inputTokens.has(token),
      );

      return {
        workflow,
        score: matchedTokens.length,
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].workflow : null;
}

const WORKFLOW_ACTION_WORDS = new Set([
  "send", "email", "mail", "message", "create", "add", "update", "edit",
  "delete", "remove", "find", "lookup", "search", "fetch", "get",
  "retrieve", "save",
  "store", "insert", "append", "notify", "schedule", "trigger",
  "run", "execute", "generate", "post", "publish", "upload",
  "download", "sync", "export", "import", "move", "copy", "archive",
  "assign",
]);

function hasWorkflowIntent(input) {
  return tokenize(input).some((token) => WORKFLOW_ACTION_WORDS.has(token));
}

function shouldAttemptWorkflow(input, workflowCatalog) {
  if (!hasWorkflowIntent(input)) {
    return false;
  }

  return Boolean(inferWorkflowForInput(workflowCatalog, input));
}

function getRequiredWorkflowFields(workflow) {
  return Array.isArray(workflow?.inputSchema?.required)
    ? workflow.inputSchema.required
    : [];
}

function createToolCallRecord(toolCall) {
  return {
    id: toolCall.id,
    tool: toolCall.tool,
    arguments: toolCall.arguments,
    result: null,
    status: "FAILED",
    error: null,
    durationMs: null,
  };
}

class AgentRuntime {
  constructor(modelProvider, toolRegistry) {
    if (!modelProvider || typeof modelProvider.generate !== "function") {
      throw new Error("A valid model provider is required");
    }

    if (
      !toolRegistry ||
      typeof toolRegistry.list !== "function" ||
      typeof toolRegistry.getForWorker !== "function" ||
      typeof toolRegistry.get !== "function"
    ) {
      throw new Error("A valid tool registry is required");
    }

    this.modelProvider = modelProvider;
    this.toolRegistry = toolRegistry;
    this.toolExecutionService = new ToolExecutionService(toolRegistry);
  }

  async execute({ worker, input, context = {}, executionPolicy }) {
    if (!worker) {
      throw new Error("Worker is required");
    }

    if (!input || typeof input !== "string") {
      throw new Error("Input must be a non-empty string");
    }

    const messages = buildPrompt(worker, input, context);

    const enabledToolNames = new Set(worker.enabledTools || []);

    if (
      Array.isArray(context.workflowCatalog) &&
      context.workflowCatalog.length > 0
    ) {
      enabledToolNames.add("n8n.trigger");
    }

    const availableTools = this.toolRegistry.getForWorker(
      Array.from(enabledToolNames),
    );

    const hasWorkflowTools =
      Array.isArray(context.workflowCatalog) &&
      context.workflowCatalog.length > 0 &&
      availableTools.some((tool) => tool.name === "n8n.trigger");

    const maxToolRounds =
      executionPolicy?.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;

    let toolRounds = 0;
    let workflowToolRetryUsed = false;
    let workflowCompletionRetryUsed = false;
    const workflowIntentDetected = shouldAttemptWorkflow(
      input,
      context.workflowCatalog,
    );
    let successfulWorkflowExecution = false;
    const toolCallRecords = [];
    let inputRequired = null;

    while (true) {
      const modelResponse = await this.modelProvider.generate({
        model: worker.model,
        messages,
        configuration: worker.configuration || {},
        executionPolicy,
        tools: availableTools,
        toolChoice:
          hasWorkflowTools &&
          (inputRequired || (workflowToolRetryUsed && workflowIntentDetected))
            ? {
                type: "function",
                function: { name: "n8n.trigger" },
              }
            : undefined,
      });

      const normalizedResponse = normalizeModelResponse(modelResponse);

      if (normalizedResponse.toolCalls.length === 0) {
        if (inputRequired) {
          return {
            success: true,
            output:
              normalizedResponse.output ||
              "Additional workflow input is required before this action can continue.",
            metadata: {
              ...normalizedResponse.metadata,
              inputRequired,
            },
            toolCalls: toolCallRecords,
          };
        }

        if (
          successfulWorkflowExecution &&
          !workflowCompletionRetryUsed
        ) {
          workflowCompletionRetryUsed = true;

          messages.push({
            role: "system",
            content:
              "A workflow has just completed successfully. Before finishing, verify whether the ORIGINAL user request is fully satisfied. If another registered workflow is required to complete the request, call n8n.trigger for that next step now. Use outputs from completed workflows as inputs for later workflows. If the request is already fully satisfied, respond with a concise final confirmation and do not call a workflow again.",
          });

          continue;
        }

        if (
          hasWorkflowTools &&
          workflowIntentDetected &&
          !workflowToolRetryUsed
        ) {
          workflowToolRetryUsed = true;

          messages.push({
            role: "system",
            content:
              "This request matches an available workflow. Execute the matching workflow now. You MUST call n8n.trigger. Extract every workflow field whose value is clearly present in the original user request or previous tool results. Omit only genuinely unresolved fields; never invent placeholders. The workflow validator will handle missing input.",
          });

          continue;
        }

        if (hasWorkflowTools && workflowIntentDetected && workflowToolRetryUsed) {
          const workflow = inferWorkflowForInput(
            context.workflowCatalog,
            input,
          );

          if (workflow) {
            const requiredFields = getRequiredWorkflowFields(workflow);

            return {
              success: true,
              output:
                normalizedResponse.output ||
                "Additional workflow input is required before this action can continue.",
              metadata: {
                ...normalizedResponse.metadata,
                inputRequired: {
                  workflowId: workflow.id,
                  workflowName: workflow.name,
                  missingFields: requiredFields,
                  reason: "WORKFLOW_TOOL_NOT_CALLED",
                },
              },
              toolCalls: toolCallRecords,
            };
          }
        }

        const result = {
          success: true,
          output: normalizedResponse.output,
          metadata: normalizedResponse.metadata,
        };

        if (toolCallRecords.length > 0) {
          result.toolCalls = toolCallRecords;
        }

        return result;
      }

      toolRounds += 1;

      if (toolRounds > maxToolRounds) {
        throw new Error(
          `Maximum tool execution rounds exceeded: ${maxToolRounds}`,
        );
      }

      messages.push({
        role: "assistant",
        content: normalizedResponse.output,
        tool_calls: normalizedResponse.toolCalls.map((toolCall) => ({
          id: toolCall.id,
          type: "function",
          function: {
            name: toolCall.tool,
            arguments: JSON.stringify(toolCall.arguments),
          },
        })),
      });

      for (const toolCall of normalizedResponse.toolCalls) {
        const record = createToolCallRecord(toolCall);
        const startedAt = Date.now();

        try {
          const toolResult = await this.toolExecutionService.execute({
            toolName: toolCall.tool,
            arguments: toolCall.arguments,
            timeoutMs: executionPolicy?.toolTimeoutMs ?? 10_000,
            permissions: worker.permissions || [],
            context,
          });

          record.result = toolResult;
          record.status = "COMPLETED";

          if (toolResult?.status !== "INPUT_REQUIRED") {
            inputRequired = null;
          }

          if (
            toolCall.tool === "n8n.trigger" &&
            toolResult?.success === true &&
            toolResult?.status !== "INPUT_REQUIRED"
          ) {
            successfulWorkflowExecution = true;
          }

          if (toolResult?.status === "INPUT_REQUIRED") {
            inputRequired = {
              workflowId: toolResult.workflowId,
              workflowName: toolResult.workflowName,
              missingFields: toolResult.missingFields || [],
              validationErrors: toolResult.validationErrors || [],
            };
          }

          record.durationMs = Date.now() - startedAt;

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        } catch (error) {
          record.status =
            error?.code === "TOOL_TIMEOUT" ? "TIMEOUT" : "FAILED";

          record.error = {
            message: error?.message || "Tool execution failed",
            code: error?.code || null,
          };

          record.durationMs = Date.now() - startedAt;

          toolCallRecords.push(record);

          error.toolCalls = toolCallRecords;

          throw error;
        }

        toolCallRecords.push(record);

        if (inputRequired) {
          messages.push({
            role: "system",
            content:
              `The last n8n workflow call could not run because its input was incomplete or invalid. Missing fields: ${inputRequired.missingFields.join(", ") || "none"}. Validation details: ${inputRequired.validationErrors.join("; ") || "none"}. Re-evaluate the original user request and previous workflow results. Correct every field you can safely determine. Do not invent values or placeholders. Call n8n.trigger again with corrected/known data and leave only genuinely unresolved required fields absent so the runtime can request them from the user.`,
          });
        }
      }
    }
  }
}

export default AgentRuntime;
