import { beforeEach, describe, expect, it, vi } from "vitest";

import OpenRouterProvider from "../src/runtime/providers/openrouter.provider.js";

describe("OpenRouterProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENROUTER_API_KEY = "test-api-key";
  });

  it("enforces the execution policy max token limit", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "gemini-3.6-flash-lite",
        choices: [
          {
            message: {
              content: "Test response",
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
          cost: 0.001,
        },
      }),
    });

    const provider = new OpenRouterProvider();

    await provider.generate({
      model: "gemini-3.6-flash-lite",
      messages: [
        {
          role: "user",
          content: "Hello",
        },
      ],
      configuration: {
        max_tokens: 100_000,
      },
      executionPolicy: {
        maxTokens: 2_000,
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const request = fetchMock.mock.calls[0][1];
    const body = JSON.parse(request.body);

    expect(body.max_tokens).toBe(2_000);
  });
  it("uses the execution policy timeout", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      (_url, options) =>
        new Promise((_, reject) => {
          options.signal.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    const provider = new OpenRouterProvider();

    await expect(
      provider.generate({
        model: "gemini-3.6-flash-lite",
        messages: [
          {
            role: "user",
            content: "Hello",
          },
        ],
        executionPolicy: {
          timeoutMs: 20,
        },
      }),
    ).rejects.toMatchObject({
      message: "Model provider request timed out.",
      statusCode: 504,
    });
  });
});
