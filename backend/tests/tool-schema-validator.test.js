import { describe, expect, it } from "vitest";

import { validateToolArguments } from "../src/tools/tool-schema-validator.js";

const calculatorSchema = {
  type: "object",
  properties: {
    expression: {
      type: "string",
    },
  },
  required: ["expression"],
  additionalProperties: false,
};

describe("validateToolArguments", () => {
  it("accepts valid tool arguments", () => {
    const result = validateToolArguments(
      {
        expression: "125 * 48",
      },
      calculatorSchema,
    );

    expect(result).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects missing required arguments", () => {
    const result = validateToolArguments({}, calculatorSchema);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("arguments.expression is required");
  });

  it("rejects incorrect argument types", () => {
    const result = validateToolArguments(
      {
        expression: 125,
      },
      calculatorSchema,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "arguments.expression must be of type string",
    );
  });

  it("rejects unexpected arguments", () => {
    const result = validateToolArguments(
      {
        expression: "125 * 48",
        extra: true,
      },
      calculatorSchema,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("arguments.extra is not allowed");
  });

  it("rejects arguments with the wrong root type", () => {
    const result = validateToolArguments("125 * 48", calculatorSchema);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("arguments must be of type object");
  });
});
