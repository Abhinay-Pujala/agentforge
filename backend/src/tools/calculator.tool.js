const ALLOWED_EXPRESSION = /^[0-9+\-*/().\s]+$/;

const calculatorTool = {
  name: "calculator",
  description: "Perform basic arithmetic calculations.",
  permission: "calculator.execute",
  schema: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description:
          "A mathematical expression using numbers and basic arithmetic operators.",
      },
    },
    required: ["expression"],
    additionalProperties: false,
  },

  async execute({ expression }) {
    if (!expression || typeof expression !== "string") {
      throw new Error("A valid expression is required");
    }

    const normalizedExpression = expression.trim();

    if (!normalizedExpression) {
      throw new Error("A valid expression is required");
    }

    if (!ALLOWED_EXPRESSION.test(normalizedExpression)) {
      throw new Error("Expression contains unsupported characters");
    }

    try {
      const result = Function(
        `"use strict"; return (${normalizedExpression})`,
      )();

      if (typeof result !== "number" || !Number.isFinite(result)) {
        throw new Error("Expression did not produce a finite number");
      }

      return {
        expression: normalizedExpression,
        result,
      };
    } catch {
      throw new Error("Invalid mathematical expression");
    }
  },
};

export default calculatorTool;
