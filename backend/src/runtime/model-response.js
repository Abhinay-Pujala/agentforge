/**
 * Normalizes a model provider response into the
 * provider-agnostic AgentForge ModelResponse contract.
 *
 * @param {Object} response
 * @returns {{output: string, metadata: Object}}
 */
export function normalizeModelResponse(response) {
  if (!response || typeof response !== "object") {
    throw new Error("Invalid model response");
  }

  if (typeof response.output !== "string" || !response.output.trim()) {
    throw new Error("Model response must contain non-empty output");
  }

  return {
    output: response.output,
    metadata:
      response.metadata && typeof response.metadata === "object"
        ? response.metadata
        : {},
  };
}
