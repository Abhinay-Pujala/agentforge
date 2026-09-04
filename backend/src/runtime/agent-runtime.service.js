import { buildPrompt } from "./prompt-builder.js";
import { normalizeModelResponse } from "./model-response.js";
import ToolExecutionService from "../tools/tool-execution.service.js";

const DEFAULT_MAX_TOOL_ROUNDS = 5;

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

    const availableTools = this.toolRegistry.getForWorker(
      worker.enabledTools || [],
    );

    const maxToolRounds =
      executionPolicy?.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;

    let toolRounds = 0;
    const toolCallRecords = [];

    while (true) {
      const modelResponse = await this.modelProvider.generate({
        model: worker.model,
        messages,
        configuration: worker.configuration || {},
        executionPolicy,
        tools: availableTools,
      });

      const normalizedResponse = normalizeModelResponse(modelResponse);

      if (normalizedResponse.toolCalls.length === 0) {
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
          });

          record.result = toolResult;
          record.status = "COMPLETED";
          record.durationMs = Date.now() - startedAt;

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        } catch (error) {
          record.status = error?.code === "TOOL_TIMEOUT" ? "TIMEOUT" : "FAILED";

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
      }
    }
  }
}

export default AgentRuntime;
