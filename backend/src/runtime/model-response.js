/**
 * Normalizes a model provider response into the
 * provider-agnostic AgentForge ModelResponse contract.
 *
 * @param {Object} response
 * @returns {{output: string|null, toolCalls: Object[], metadata: Object}}
 */
export function normalizeModelResponse(response) {
  if (!response || typeof response !== "object") {
    throw new Error("Invalid model response");
  }

  const output =
    typeof response.output === "string" && response.output.trim()
      ? response.output
      : null;

  const toolCalls = Array.isArray(response.toolCalls) ? response.toolCalls : [];

  for (const toolCall of toolCalls) {
    if (!toolCall || typeof toolCall !== "object") {
      throw new Error("Invalid tool call");
    }

    if (!toolCall.id || typeof toolCall.id !== "string") {
      throw new Error("Tool call ID is required");
    }

    if (!toolCall.tool || typeof toolCall.tool !== "string") {
      throw new Error("Tool call name is required");
    }

    if (
      !toolCall.arguments ||
      typeof toolCall.arguments !== "object" ||
      Array.isArray(toolCall.arguments)
    ) {
      throw new Error("Tool call arguments must be an object");
    }
  }

  if (!output && toolCalls.length === 0) {
    throw new Error("Model response must contain output or tool calls");
  }

  return {
    output,
    toolCalls,
    metadata:
      response.metadata && typeof response.metadata === "object"
        ? response.metadata
        : {},
  };
}
