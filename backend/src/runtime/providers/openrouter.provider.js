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
    const {
      model,
      messages,
      configuration = {},
      executionPolicy,
      tools = [],
    } = request;

    const controller = new AbortController();

    const timeoutMs = executionPolicy?.timeoutMs ?? 30_000;

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

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
          max_tokens: executionPolicy?.maxTokens,
          ...(tools.length > 0
            ? {
                tools: tools.map((tool) => ({
                  type: "function",
                  function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.schema,
                  },
                })),
              }
            : {}),
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

      const message = data?.choices?.[0]?.message;

      if (!message) {
        const error = new Error("OpenRouter returned an empty response");
        error.statusCode = 502;
        throw error;
      }

      const output =
        typeof message.content === "string" && message.content.trim()
          ? message.content
          : null;

      const toolCalls = Array.isArray(message.tool_calls)
        ? message.tool_calls.map((toolCall) => {
            let parsedArguments = {};

            try {
              parsedArguments =
                typeof toolCall.function?.arguments === "string"
                  ? JSON.parse(toolCall.function.arguments)
                  : toolCall.function?.arguments || {};
            } catch {
              throw new Error(
                `Invalid arguments returned for tool: ${
                  toolCall.function?.name || "unknown"
                }`,
              );
            }

            return {
              id: toolCall.id,
              tool: toolCall.function?.name,
              arguments: parsedArguments,
            };
          })
        : [];

      if (!output && toolCalls.length === 0) {
        const error = new Error("OpenRouter returned an empty response");
        error.statusCode = 502;
        throw error;
      }

      return {
        output,
        toolCalls,
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
