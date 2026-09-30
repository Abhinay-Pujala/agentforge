import { buildPrompt } from "./prompt-builder.js";
import { normalizeModelResponse } from "./model-response.js";
import ToolExecutionService from "../tools/tool-execution.service.js";

const DEFAULT_MAX_TOOL_ROUNDS = 8;

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

function extractExplicitEmailMessage(input) {
  const text = String(input || "").trim();

  // Keep this intentionally conservative: only treat content introduced by
  // an explicit message cue as user-provided email content.
  const match = text.match(
    /\\b(?:saying|say|with\\s+(?:the\\s+)?message|message\\s+(?:is|:)|body\\s+(?:is|:))\\s*[:\\-]?\\s*(.+)$/i,
  );

  return match?.[1]?.trim() || "";
}

function isLikelyUserProvidedMessage(message, input) {
  const messageText = String(message || "").trim().toLowerCase();
  const explicitMessage = extractExplicitEmailMessage(input).toLowerCase();

  if (!messageText || !explicitMessage) return false;

  // A model may polish the user's wording into a natural email body. Treat
  // it as user-derived when it contains all meaningful tokens from the
  // explicitly supplied message, while still rejecting invented bodies.
  const normalizeTokens = (value) =>
    String(value || "")
      .replace(/[“”‘’]/g, "'")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2);

  const suppliedTokens = new Set(normalizeTokens(explicitMessage));
  const generatedTokens = new Set(normalizeTokens(messageText));

  if (suppliedTokens.size === 0) return false;

  return [...suppliedTokens].every((token) => generatedTokens.has(token));
}

function getRequiredWorkflowFields(workflow) {
  return Array.isArray(workflow?.inputSchema?.required)
    ? workflow.inputSchema.required
    : [];
}

function getWorkflowExecutionKey(toolCall) {
  if (toolCall?.tool !== "n8n.trigger") {
    return null;
  }

  return JSON.stringify({
    workflowId: toolCall.arguments?.workflowId ?? null,
    data: toolCall.arguments?.data ?? {},
  });
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
    let inputRecoveryAttempts = 0;
    const workflowIntentDetected = shouldAttemptWorkflow(
      input,
      context.workflowCatalog,
    );
    let workflowCallRequired = hasWorkflowTools && workflowIntentDetected;
    let successfulWorkflowExecution = false;
    const toolCallRecords = [];
    const successfulWorkflowKeys = new Set();
    const successfulWorkflowIds = new Set();
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
          workflowCallRequired
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
          workflowCallRequired = true;

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
        if (inputRequired) {
          return {
            success: true,
            output:
              "Additional information is required before this action can continue.",
            metadata: { inputRequired },
            toolCalls: toolCallRecords,
          };
        }

        if (successfulWorkflowExecution) {
          return {
            success: true,
            output:
              "The requested workflow action was completed successfully.",
            metadata: {},
            toolCalls: toolCallRecords,
          };
        }

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
        const workflowId = toolCall.arguments?.workflowId ?? null;
        const repeatedSuccessfulWorkflow =
          toolCall.tool === "n8n.trigger" &&
          workflowId &&
          successfulWorkflowIds.has(workflowId);

        if (repeatedSuccessfulWorkflow) {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: true,
              status: "ALREADY_COMPLETED",
              message:
                "This workflow was already completed successfully during this execution. Do not execute it again.",
            }),
          });

          messages.push({
            role: "system",
            content:
              "The requested workflow has already completed successfully. Do not call any workflow again. Write a natural, concise final response that confirms what was completed and includes useful details from the completed workflow result. Do not mention internal workflow IDs, duplicate prevention, or tool execution.",
          });

          const finalModelResponse = await this.modelProvider.generate({
            model: worker.model,
            messages,
            configuration: worker.configuration || {},
            executionPolicy,
            tools: [],
          });

          const normalizedFinalResponse =
            normalizeModelResponse(finalModelResponse);

          return {
            success: true,
            output:
              normalizedFinalResponse.output ||
              "Done — the requested action was completed successfully.",
            metadata: normalizedFinalResponse.metadata,
            toolCalls: toolCallRecords,
          };
        }

        const record = createToolCallRecord(toolCall);
        const startedAt = Date.now();

        try {
          const workflowExecutionKey = getWorkflowExecutionKey(toolCall);
          const workflowId = toolCall.arguments?.workflowId ?? null;

          // When resuming a WAITING_FOR_INPUT execution, the server passes the
          // user's new value explicitly through context. Merge that value into
          // missing workflow fields before validation so the model does not
          // have to reproduce the exact wording in a tool call.
          if (
            toolCall.tool === "n8n.trigger" &&
            context.explicitWorkflowInput &&
            typeof context.explicitWorkflowInput === "object"
          ) {
            const explicitInput = context.explicitWorkflowInput;
            const data = {
              ...(toolCall.arguments?.data || {}),
            };

            for (const [field, value] of Object.entries(explicitInput)) {
              if (typeof value === "string" && value.trim()) {
                data[field] = value.trim();
              }
            }

            toolCall.arguments = {
              ...toolCall.arguments,
              data,
            };
          }

          // A successful registered workflow is a completed side effect for
          // this execution. Do not let the model repeatedly trigger the same
          // workflow with slightly different arguments and exhaust the round
          // budget (for example, repeatedly sending the same email).
          const duplicateSuccessfulWorkflow =
            workflowExecutionKey &&
            successfulWorkflowKeys.has(workflowExecutionKey);

          const repeatedSuccessfulWorkflow =
            workflowId && successfulWorkflowIds.has(workflowId);

          let toolResult;

          const workflowDefinition = context.workflowCatalog?.find(
            (workflow) =>
              workflow.id?.toString() === workflowId?.toString(),
          );

          const workflowRequiresUserMessage =
            toolCall.tool === "n8n.trigger" &&
            !duplicateSuccessfulWorkflow &&
            !repeatedSuccessfulWorkflow &&
            workflowDefinition?.inputSchema?.required?.includes("message");

          const suppliedMessage =
            typeof toolCall.arguments?.data?.message === "string"
              ? toolCall.arguments.data.message.trim()
              : "";

          const inventedEmailMessage =
            workflowRequiresUserMessage &&
            suppliedMessage &&
            !isLikelyUserProvidedMessage(suppliedMessage, input);

          if (inventedEmailMessage) {
            toolResult = {
              status: "INPUT_REQUIRED",
              workflowId,
              workflowName: workflowDefinition?.name || "Email workflow",
              missingFields: ["message"],
              validationErrors: [
                "message must be explicitly provided by the user",
              ],
              message:
                "An email message must be provided by the user before the email can be sent.",
            };
          } else {
            toolResult =
              duplicateSuccessfulWorkflow || repeatedSuccessfulWorkflow
                ? {
                    success: true,
                    status: "ALREADY_COMPLETED",
                    message:
                      "This workflow was already completed successfully during this execution. Do not execute it again. Continue the original request using its existing result.",
                  }
                : await this.toolExecutionService.execute({
                    toolName: toolCall.tool,
                    arguments: toolCall.arguments,
                    timeoutMs: executionPolicy?.toolTimeoutMs ?? 10_000,
                    permissions: worker.permissions || [],
                    context,
                  });
          }

          record.result = toolResult;
          record.status = "COMPLETED";

          if (toolCall.tool === "n8n.trigger") {
            workflowCallRequired = toolResult?.status === "INPUT_REQUIRED";
          }

          if (toolResult?.status !== "INPUT_REQUIRED") {
            inputRequired = null;
          }

          if (
            toolCall.tool === "n8n.trigger" &&
            toolResult?.success === true &&
            toolResult?.status !== "INPUT_REQUIRED"
          ) {
            successfulWorkflowExecution = true;

            const workflowExecutionKey = getWorkflowExecutionKey(toolCall);
            if (workflowExecutionKey) {
              successfulWorkflowKeys.add(workflowExecutionKey);
            }

            const workflowId = toolCall.arguments?.workflowId ?? null;
            if (workflowId) {
              successfulWorkflowIds.add(workflowId);
            }
          }

          if (toolResult?.status === "INPUT_REQUIRED") {
            inputRecoveryAttempts += 1;

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

        // A repeated successful workflow is already complete. Stop the
        // orchestration loop instead of allowing the model to call the same
        // external side effect until the round limit is exhausted.
        if (record.result?.status === "ALREADY_COMPLETED") {
          messages.push({
            role: "system",
            content:
              "The requested workflow has already completed successfully. Do not call any workflow again. Write the final response to the user naturally and concisely. Explain what action was completed and include useful details available in the workflow results, such as the recipient or other relevant result data. Never claim an action that was not completed.",
          });

          const finalModelResponse = await this.modelProvider.generate({
            model: worker.model,
            messages,
            configuration: worker.configuration || {},
            executionPolicy,
            tools: [],
          });

          const normalizedFinalResponse =
            normalizeModelResponse(finalModelResponse);

          return {
            success: true,
            output:
              normalizedFinalResponse.output ||
              "The requested workflow action was completed successfully.",
            metadata: normalizedFinalResponse.metadata,
            toolCalls: toolCallRecords,
          };
        }

        if (inputRequired) {
          // Some input failures are intentionally non-recoverable inside the
          // same model turn. In particular, when an email body was generated
          // by the model but was not explicitly supplied by the user, retrying
          // the same turn only produces another invented body and another
          // INPUT_REQUIRED tool call. Stop here and surface the missing input
          // to the execution UI so the user can provide it.
          const requiresExplicitUserInput =
            inputRequired.validationErrors?.some((error) =>
              error.includes("must be explicitly provided by the user"),
            );

          if (requiresExplicitUserInput) {
            return {
              success: true,
              output:
                "Additional information is required before this action can continue.",
              metadata: {
                inputRequired,
              },
              toolCalls: toolCallRecords,
            };
          }

          if (inputRecoveryAttempts >= 2) {
            return {
              success: true,
              output:
                "Additional information is required before this action can continue.",
              metadata: {
                inputRequired,
              },
              toolCalls: toolCallRecords,
            };
          }

          workflowCallRequired = true;

          messages.push({
            role: "system",
            content:
              `The last n8n workflow call could not run because its input was incomplete or invalid. Missing fields: ${inputRequired.missingFields.join(", ") || "none"}. Validation details: ${inputRequired.validationErrors.join("; ") || "none"}. Re-evaluate the original user request and previous workflow results. Correct every field you can safely determine. Do not invent values or placeholders. Call n8n.trigger again with corrected/known data and leave only genuinely unresolved required fields absent so the runtime can request them from the user. This is the final automatic input-recovery attempt for this workflow.`,
          });
        }
      }
    }
  }
}

export default AgentRuntime;
