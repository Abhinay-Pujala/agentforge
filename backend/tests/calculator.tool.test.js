import { describe, expect, it } from "vitest";
import calculatorTool from "../src/tools/calculator.tool.js";

describe("calculator tool", () => {
  it("has the required tool metadata", () => {
    expect(calculatorTool.name).toBe("calculator");
    expect(calculatorTool.description).toBeTruthy();
    expect(calculatorTool.schema).toBeDefined();
    expect(typeof calculatorTool.execute).toBe("function");
  });

  it("calculates basic arithmetic", async () => {
    const result = await calculatorTool.execute({
      expression: "2 + 3 * 4",
    });

    expect(result).toEqual({
      expression: "2 + 3 * 4",
      result: 14,
    });
  });

  it("supports parentheses", async () => {
    const result = await calculatorTool.execute({
      expression: "(20 + 10) / 2",
    });

    expect(result.result).toBe(15);
  });

  it("supports decimal numbers", async () => {
    const result = await calculatorTool.execute({
      expression: "3.5 * 4",
    });

    expect(result.result).toBe(14);
  });

  it("rejects unsupported characters", async () => {
    await expect(
      calculatorTool.execute({
        expression: "process.env.SECRET",
      }),
    ).rejects.toThrow("Expression contains unsupported characters");
  });

  it("rejects an empty expression", async () => {
    await expect(
      calculatorTool.execute({
        expression: "   ",
      }),
    ).rejects.toThrow("A valid expression is required");
  });

  it("rejects invalid mathematical expressions", async () => {
    await expect(
      calculatorTool.execute({
        expression: "2 +",
      }),
    ).rejects.toThrow("Invalid mathematical expression");
  });

  it("rejects non-string expressions", async () => {
    await expect(
      calculatorTool.execute({
        expression: 123,
      }),
    ).rejects.toThrow("A valid expression is required");
  });
});
