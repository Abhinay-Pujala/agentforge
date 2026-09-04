import { describe, expect, it } from "vitest";

import {
  getExecutionPolicy,
  validateExecutionCost,
  validateExecutionPolicy,
} from "../src/runtime/execution-policy.js";

describe("execution policy", () => {
  it("allows a supported model", () => {
    const worker = {
      model: "gemini-3.6-flash-lite",
    };

    expect(() => validateExecutionPolicy(worker)).not.toThrow();
  });

  it("rejects a missing worker", () => {
    expect(() => validateExecutionPolicy()).toThrow("Worker is required");
  });

  it("rejects a missing model", () => {
    expect(() =>
      validateExecutionPolicy({
        model: "",
      }),
    ).toThrow("Worker model is required");
  });

  it("rejects an unsupported model", () => {
    expect(() =>
      validateExecutionPolicy({
        model: "unsupported-model",
      }),
    ).toThrow("Unsupported model: unsupported-model");
  });

  it("exposes execution guardrails", () => {
    const policy = getExecutionPolicy();

    expect(policy).toEqual({
      provider: "openrouter",
      supportedModels: ["gemini-3.6-flash-lite", "openai/gpt-4o-mini"],
      timeoutMs: 30_000,
      maxTokens: 2_000,
      maxCost: 0.05,
    });
  });
});

describe("execution cost policy", () => {
  it("allows missing cost metadata", () => {
    expect(() => validateExecutionCost(null)).not.toThrow();
    expect(() => validateExecutionCost(undefined)).not.toThrow();
  });

  it("allows a cost within the limit", () => {
    expect(() => validateExecutionCost(0.01)).not.toThrow();
    expect(() => validateExecutionCost(0.05)).not.toThrow();
  });

  it("rejects a cost above the limit", () => {
    expect(() => validateExecutionCost(0.06)).toThrow(
      "Execution cost exceeded the maximum allowed cost of 0.05",
    );
  });

  it("rejects invalid cost metadata", () => {
    expect(() => validateExecutionCost(-1)).toThrow(
      "Invalid execution cost metadata",
    );

    expect(() => validateExecutionCost("0.01")).toThrow(
      "Invalid execution cost metadata",
    );
  });
});
