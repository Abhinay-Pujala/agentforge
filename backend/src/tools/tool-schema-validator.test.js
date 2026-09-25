import { describe, expect, it } from "vitest";
import { validateToolArguments } from "./tool-schema-validator.js";

describe("validateToolArguments", () => {
  const schema = {
    type: "object",
    properties: {
      to: { type: "string" },
      message: { type: "string" },
    },
    required: ["to", "message"],
    additionalProperties: false,
  };

  it("rejects an empty required string as missing", () => {
    const result = validateToolArguments(
      {
        to: "abhinaypurimetla@gmail.com",
        message: "",
      },
      schema,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("arguments.message is required");
  });

  it("rejects a whitespace-only required string as missing", () => {
    const result = validateToolArguments(
      {
        to: "abhinaypurimetla@gmail.com",
        message: "   ",
      },
      schema,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("arguments.message is required");
  });

  it("accepts a non-empty required string", () => {
    const result = validateToolArguments(
      {
        to: "abhinaypurimetla@gmail.com",
        message: "Happy Krishna Janmashtami!",
      },
      schema,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
