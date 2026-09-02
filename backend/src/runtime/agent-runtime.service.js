import { buildPrompt } from "./prompt-builder.js";
import { normalizeModelResponse } from "./model-response.js";

/**
 * Generic Agent Runtime.
 *
 * Coordinates prompt construction and model execution
 * without knowing anything about HTTP, databases,
 * authentication, or a specific model provider.
 */
class AgentRuntime {
  constructor(modelProvider) {
    if (!modelProvider || typeof modelProvider.generate !== "function") {
      throw new Error("A valid model provider is required");
    }

    this.modelProvider = modelProvider;
  }

  async execute({ worker, input, context = {}, executionPolicy }) {
    if (!worker) {
      throw new Error("Worker is required");
    }

    if (!input || typeof input !== "string") {
      throw new Error("Input must be a non-empty string");
    }

    const messages = buildPrompt(worker, input, context);

    const modelResponse = await this.modelProvider.generate({
      model: worker.model,
      messages,
      configuration: worker.configuration || {},
      executionPolicy,
    });

    const normalizedResponse = normalizeModelResponse(modelResponse);

    return {
      success: true,
      output: normalizedResponse.output,
      metadata: normalizedResponse.metadata,
    };
  }
}

export default AgentRuntime;
