import ModelProvider from "../model-provider.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

class OpenRouterProvider extends ModelProvider {
  constructor() {
    super();

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    this.apiKey = process.env.OPENROUTER_API_KEY;
  }

  async generate(request) {
    const { model, messages, configuration = {} } = request;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          ...configuration,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(
          data?.error?.message || "OpenRouter request failed",
        );

        error.statusCode = response.status >= 500 ? 502 : response.status;

        throw error;
      }

      const output = data?.choices?.[0]?.message?.content;

      if (!output) {
        const error = new Error("OpenRouter returned an empty response");
        error.statusCode = 502;
        throw error;
      }

      return {
        output,
        metadata: {
          provider: "openrouter",
          model: data.model || model,
          usage: data.usage || null,
        },
      };
    } catch (error) {
      if (error.name === "AbortError") {
        const timeoutError = new Error("Model provider request timed out.");

        timeoutError.statusCode = 504;

        throw timeoutError;
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export default OpenRouterProvider;
