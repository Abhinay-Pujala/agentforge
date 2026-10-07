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

const WORKFLOW_CATEGORY_HINTS = {
  calendar: new Set([
    "calendar",
    "meeting",
    "meetings",
    "event",
    "events",
    "schedule",
    "scheduled",
    "appointment",
    "appointments",
  ]),
  email: new Set([
    "email",
    "emails",
    "mail",
    "inbox",
    "unread",
    "message",
    "messages",
  ]),
  gmail: new Set([
    "email",
    "emails",
    "mail",
    "gmail",
    "inbox",
    "unread",
    "message",
    "messages",
  ]),
  mail: new Set([
    "email",
    "emails",
    "mail",
    "gmail",
    "inbox",
    "unread",
    "message",
    "messages",
  ]),
};

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

      const capabilityTokens = Array.isArray(workflow.capabilities)
        ? workflow.capabilities.flatMap((capability) => tokenize(capability))
        : [];

      const matchedCapabilities = capabilityTokens.filter((token) =>
        inputTokens.has(token),
      );

      const category = String(workflow.category || "").toLowerCase();
      const categoryHints = WORKFLOW_CATEGORY_HINTS[category] || new Set();
      const categoryHintMatches = [...categoryHints].filter((token) =>
        inputTokens.has(token),
      );

      return {
        workflow,
        // Capabilities are explicit semantic metadata and therefore carry
        // more weight than incidental words from a description.
        score:
          matchedCapabilities.length * 4 +
          categoryHintMatches.length * 2 +
          matchedTokens.length,
        matchedCapabilities,
        matchedTokens,
        categoryHintMatches,
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].workflow : null;
}

const WORKFLOW_ACTION_WORDS = new Set([
  "send",
  "reply",
  "respond",
  "create",
  "add",
  "update",
  "edit",
  "delete",
  "remove",
  "find",
  "lookup",
  "search",
  "fetch",
  "get",
  "retrieve",
  "save",
  "store",
  "insert",
  "append",
  "notify",
  "schedule",
  "trigger",
  "run",
  "execute",
  "generate",
  "post",
  "publish",
  "upload",
  "download",
  "sync",
  "export",
  "import",
  "move",
  "copy",
  "archive",
  "assign",
]);

function isConversationalInput(input) {
  const normalized = String(input || "")
    .trim()
    .toLowerCase();

  if (!normalized) return true;

  return (
    /^(?:hi|hello|hey|yo|thanks|thank you|good morning|good afternoon|good evening)[!,.s]*$/i.test(
      normalized,
    ) ||
    /^(?:what can you do|what do you do|who are you|how can you help|what are your capabilities)[?!.,s]*$/i.test(
      normalized,
    ) ||
    /^(?:can you|could you) (?:explain|tell me about|describe|help me understand)\b/i.test(
      normalized,
    ) ||
    /^(?:how do i|how can i|what is|what are|why does|why is|tell me about)\b/i.test(
      normalized,
    ) ||
    /^(?:can|could|would|should|do|does|is|are)\b[^\n]*\?$/i.test(normalized)
  );
}
function isWorkflowPlaceholderInput(input) {
  const normalized = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");

  // The Run Worker UI uses this as its initial placeholder. It is status
  // text, not a user request, so it must never unlock a side-effecting
  // workflow.
  return new Set([
    "worker is ready to execute",
    "worker ready to execute",
    "ready to execute",
  ]).has(normalized);
}

const WORKFLOW_REQUEST_WORDS = new Set([
  "show",
  "list",
  "check",
  "view",
  "see",
  "have",
  "anything",
  "any",
  "upcoming",
  "latest",
  "today",
  "tomorrow",
  "yesterday",
  "week",
  "month",
  "meeting",
  "meetings",
  "event",
  "events",
  "scheduled",
  "schedule",
  "unread",
  "recent",
  "new",
]);

function hasWorkflowRequestContext(input) {
  return tokenize(input).some((token) => WORKFLOW_REQUEST_WORDS.has(token));
}

function hasWorkflowIntent(input, workflowCatalog = []) {
  if (isWorkflowPlaceholderInput(input)) {
    return false;
  }

  const workflow = inferWorkflowForInput(workflowCatalog, input);
  const tokens = tokenize(input);
  const hasExplicitAction = tokens.some((token) =>
    WORKFLOW_ACTION_WORDS.has(token),
  );
  const hasRequestContext = hasWorkflowRequestContext(input);

  // A workflow must be relevant to the request before any side effecting
  // tool can be exposed. This prevents a single registered workflow from
  // hijacking unrelated requests such as "create a function".
  if (!workflow) {
    return false;
  }

  // Explicit actions are strong evidence, but only when a relevant workflow
  // was actually discovered.
  if (hasExplicitAction) {
    return true;
  }

  // Conversational/knowledge questions should remain ordinary conversation.
  if (isConversationalInput(input)) {
    return hasRequestContext;
  }

  // Natural requests such as "What do I have on my calendar tomorrow?"
  // contain request context without necessarily using an action verb.
  return hasRequestContext;
}

function shouldAttemptWorkflow(input, workflowCatalog) {
  if (!Array.isArray(workflowCatalog) || workflowCatalog.length === 0) {
    return false;
  }

  return hasWorkflowIntent(input, workflowCatalog);
}

function isPlaceholderWorkflowValue(value, fieldName = "") {
  if (typeof value !== "string") return false;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "");
  if (!normalized) return true;

  const generic = new Set([
    "unknown",
    "not provided",
    "not specified",
    "not available",
    "n/a",
    "na",
    "none",
    "null",
    "undefined",
    "missing",
    "required",
    "placeholder",
  ]);

  if (generic.has(normalized)) return true;

  const field = String(fieldName || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();

  const aliases = ["message", "text", "body", "content"].includes(field)
    ? ["message", "text", "body", "content"]
    : [field];

  return aliases.some((alias) => {
    return (
      new RegExp(
        "^(?:no\\s+)?" +
          alias +
          "\\s+(?:is\\s+)?(?:required|missing|provided|specified|available|given)$",
        "i",
      ).test(normalized) ||
      new RegExp(
        "^" +
          alias +
          "\\s+(?:is\\s+)?(?:not\\s+provided|not\\s+specified|not\\s+available|missing)$",
        "i",
      ).test(normalized)
    );
  });
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

    const workflowIntentDetected =
      Boolean(context.resumedFromExecutionId) ||
      shouldAttemptWorkflow(input, context.workflowCatalog);

    const enabledToolNames = new Set(worker.enabledTools || []);

    // Do not expose the side-effecting n8n tool to ordinary conversation.
    // This is enforced here rather than only through prompting.
    if (
      Array.isArray(context.workflowCatalog) &&
      context.workflowCatalog.length > 0 &&
      workflowIntentDetected
    ) {
      enabledToolNames.add("n8n.trigger");
    } else {
      enabledToolNames.delete("n8n.trigger");
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
    let workflowCallRequired = hasWorkflowTools && workflowIntentDetected;
    let successfulWorkflowExecution = false;
    const toolCallRecords = [];
    const successfulWorkflowKeys = new Set();
    let inputRequired = null;

    while (true) {
      const modelResponse = await this.modelProvider.generate({
        model: worker.model,
        messages,
        configuration: worker.configuration || {},
        executionPolicy,
        tools: availableTools,
        toolChoice:
          hasWorkflowTools && workflowCallRequired
            ? {
                type: "function",
                function: { name: "n8n.trigger" },
              }
            : undefined,
      });

      const normalizedResponse = normalizeModelResponse(modelResponse);

      // A workflow request may contain multiple independent actions. Execute
      // each registered workflow call sequentially while preventing exact
      // duplicate workflow actions from running more than once.
      const toolCallsForExecution =
        hasWorkflowTools && workflowIntentDetected
          ? normalizedResponse.toolCalls.filter(
              (call) => call.tool === "n8n.trigger",
            )
          : normalizedResponse.toolCalls;

      if (toolCallsForExecution.length === 0) {
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

        // A workflow-intent request must produce a workflow call. Do not
        // repeatedly ask the model to retry; this execution gets one model
        // decision and one workflow attempt.
        if (workflowCallRequired && hasWorkflowTools) {
          const workflow = inferWorkflowForInput(
            context.workflowCatalog,
            input,
          );

          return {
            success: true,
            output:
              normalizedResponse.output ||
              "Additional workflow input is required before this action can continue.",
            metadata: workflow
              ? {
                  ...normalizedResponse.metadata,
                  inputRequired: {
                    workflowId: workflow.id,
                    workflowName: workflow.name,
                    missingFields: getRequiredWorkflowFields(workflow),
                    reason: "WORKFLOW_TOOL_NOT_CALLED",
                  },
                }
              : normalizedResponse.metadata,
            toolCalls: toolCallRecords,
          };
        }

        return {
          success: true,
          output: normalizedResponse.output,
          metadata: normalizedResponse.metadata,
          ...(toolCallRecords.length > 0 ? { toolCalls: toolCallRecords } : {}),
        };
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
            output: "The requested workflow action was completed successfully.",
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
        tool_calls: toolCallsForExecution.map((toolCall) => ({
          id: toolCall.id,
          type: "function",
          function: {
            name: toolCall.tool,
            arguments: JSON.stringify(toolCall.arguments),
          },
        })),
      });

      for (const toolCall of toolCallsForExecution) {
        const record = createToolCallRecord(toolCall);
        const startedAt = Date.now();

        try {
          let workflowId = toolCall.arguments?.workflowId ?? null;

          // A dedicated worker with one registered workflow is deterministic.
          // Correct the model's workflow ID to the only allowed workflow and
          // normalize a missing data object before validation.
          if (
            toolCall.tool === "n8n.trigger" &&
            Array.isArray(context.workflowCatalog) &&
            context.workflowCatalog.length === 1
          ) {
            const onlyWorkflow = context.workflowCatalog[0];

            toolCall.arguments = {
              ...toolCall.arguments,
              workflowId: onlyWorkflow.id,
              data:
                toolCall.arguments?.data &&
                typeof toolCall.arguments.data === "object"
                  ? toolCall.arguments.data
                  : {},
            };

            workflowId = onlyWorkflow.id;
          }

          // The model only controls the public n8n.trigger contract.
          // Runtime-only fields such as resumeTargetField belong in context,
          // never in tool arguments. Strip any accidental extra top-level
          // fields before the generic tool-schema validator runs.
          if (toolCall.tool === "n8n.trigger") {
            toolCall.arguments = {
              workflowId: toolCall.arguments?.workflowId,
              data:
                toolCall.arguments?.data &&
                typeof toolCall.arguments.data === "object"
                  ? toolCall.arguments.data
                  : {},
            };
          }

          // When resuming a WAITING_FOR_INPUT execution, the server passes the
          // user's new value explicitly through context. Merge that value into
          // missing workflow fields before validation so the model does not
          // have to reproduce the exact wording in a tool call.
          if (toolCall.tool === "n8n.trigger") {
            const pendingData =
              context.pendingWorkflowData &&
              typeof context.pendingWorkflowData === "object"
                ? context.pendingWorkflowData
                : {};
            const explicitInput =
              context.explicitWorkflowInput &&
              typeof context.explicitWorkflowInput === "object"
                ? context.explicitWorkflowInput
                : {};

            // Resume from a paused workflow as a stateful continuation:
            // preserve all values already collected, then overlay the user's
            // new answer. This prevents the model from having to reproduce
            // previously resolved fields exactly.
            const data = {
              ...(toolCall.arguments?.data || {}),
              ...pendingData,
            };

            for (const [field, value] of Object.entries(explicitInput)) {
              // The explicit answer is authoritative input, but it is not
              // necessarily the final formatted workflow value. Let the model
              // transform it (for example, "birthday wishes" -> a polished
              // email body). Only use the raw answer as a fallback when the
              // model omitted the field or produced a placeholder.
              const currentValue = data[field];
              const isMissing =
                currentValue === undefined ||
                currentValue === null ||
                (typeof currentValue === "string" && !currentValue.trim());

              const isPlaceholder = isPlaceholderWorkflowValue(
                currentValue,
                field,
              );

              if (isMissing || isPlaceholder) {
                if (typeof value === "string" && value.trim()) {
                  data[field] = value.trim();
                } else if (value !== undefined && value !== null) {
                  data[field] = value;
                }
              }
            }

            toolCall.arguments = {
              ...toolCall.arguments,
              data,
            };
          }

          // Duplicate protection is based on the normalized workflow action,
          // so different actions can use the same workflow while an exact
          // repeated action is executed only once.
          const workflowExecutionKey = getWorkflowExecutionKey(toolCall);
          const duplicateSuccessfulWorkflow =
            workflowExecutionKey &&
            successfulWorkflowKeys.has(workflowExecutionKey);

          let toolResult;

          if (duplicateSuccessfulWorkflow) {
            toolResult = {
              success: true,
              status: "ALREADY_COMPLETED",
              message:
                "This workflow action was already completed successfully during this execution. Do not execute it again.",
            };
          } else {
            toolResult = await this.toolExecutionService.execute({
                  toolName: toolCall.tool,
                  arguments: toolCall.arguments,
                  timeoutMs:
                    executionPolicy?.toolTimeouts?.[toolCall.tool] ??
                    executionPolicy?.toolTimeoutMs ??
                    10_000,
                  permissions: worker.permissions || [],
                  context,
                });
          }

          record.result = toolResult;
          record.status =
            toolResult?.status === "INPUT_REQUIRED"
              ? "WAITING_FOR_INPUT"
              : "COMPLETED";

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
            if (workflowExecutionKey) {
              successfulWorkflowKeys.add(workflowExecutionKey);
            }
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
          record.status = error?.code === "TOOL_TIMEOUT" ? "TIMEOUT" : "FAILED";

          record.error = {
            message:
              error?.userMessage || error?.message || "Tool execution failed",
            code: error?.code || null,
            category: error?.category || null,
            retryable: error?.retryable ?? false,
          };

          record.durationMs = Date.now() - startedAt;

          toolCallRecords.push(record);

          error.toolCalls = toolCallRecords;

          throw error;
        }

        toolCallRecords.push(record);

        if (inputRequired) {
          // A workflow input failure is a deterministic handoff to the user.
          // Do not ask the model to retry with guessed values. The execution
          // controller will persist WAITING_FOR_INPUT and resume with the
          // user's explicit value.
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

      }

      if (successfulWorkflowExecution && !inputRequired) {
        const finalMessages = [
          ...messages,
          {
            role: "system",
            content:
              "All requested workflow actions have completed successfully. Do not call any workflow again. Respond with a concise natural summary of each completed action, including useful details from the workflow results. Never claim an action that was not completed.",
          },
        ];

        const finalModelResponse = await this.modelProvider.generate({
          model: worker.model,
          messages: finalMessages,
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
            "The requested workflow actions were completed successfully.",
          metadata: normalizedFinalResponse.metadata,
          toolCalls: toolCallRecords,
        };
      }
    }
  }
}

export default AgentRuntime;
