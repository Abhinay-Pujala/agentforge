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
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "OpenRouter request failed");
    }

    const output = data?.choices?.[0]?.message?.content;

    if (!output) {
      throw new Error("OpenRouter returned an empty response");
    }

    return {
      output,
      metadata: {
        provider: "openrouter",
        model: data.model || model,
        usage: data.usage || null,
      },
    };
  }
}

export default OpenRouterProvider;
