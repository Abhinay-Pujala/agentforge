import { describe, expect, it } from "vitest";
import ToolRegistry from "../src/tools/tool-registry.js";

describe("ToolRegistry", () => {
  const calculatorTool = {
    name: "calculator",
    description: "Performs basic calculations.",
    schema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
        },
      },
      required: ["expression"],
    },
    execute: async ({ expression }) => expression,
  };

  it("registers and retrieves a tool", () => {
    const registry = new ToolRegistry();

    registry.register(calculatorTool);

    expect(registry.get("calculator")).toBe(calculatorTool);
  });

  it("checks whether a tool exists", () => {
    const registry = new ToolRegistry();

    registry.register(calculatorTool);

    expect(registry.has("calculator")).toBe(true);
    expect(registry.has("unknown")).toBe(false);
  });

  it("lists registered tool metadata", () => {
    const registry = new ToolRegistry();

    registry.register(calculatorTool);

    expect(registry.list()).toEqual([
      {
        name: "calculator",
        description: "Performs basic calculations.",
        schema: calculatorTool.schema,
      },
    ]);
  });

  it("rejects duplicate tool names", () => {
    const registry = new ToolRegistry();

    registry.register(calculatorTool);

    expect(() => registry.register(calculatorTool)).toThrow(
      "Tool already registered: calculator",
    );
  });

  it("rejects invalid tools", () => {
    const registry = new ToolRegistry();

    expect(() => registry.register(null)).toThrow("Tool is required");
    expect(() => registry.register({})).toThrow("Tool name is required");
  });
  it("returns only tools enabled for a worker", () => {
    const registry = new ToolRegistry();

    const githubTool = {
      name: "github",
      description: "Interact with GitHub.",
      schema: {},
      execute: async () => "github",
    };

    registry.register(calculatorTool);
    registry.register(githubTool);

    expect(registry.getForWorker(["calculator"])).toEqual([calculatorTool]);
  });

  it("ignores tools that are not registered", () => {
    const registry = new ToolRegistry();

    registry.register(calculatorTool);

    expect(registry.getForWorker(["calculator", "gmail"])).toEqual([
      calculatorTool,
    ]);
  });

  it("returns no tools when none are enabled", () => {
    const registry = new ToolRegistry();

    registry.register(calculatorTool);

    expect(registry.getForWorker([])).toEqual([]);
  });

  it("returns no tools for invalid enabledTools configuration", () => {
    const registry = new ToolRegistry();

    registry.register(calculatorTool);

    expect(registry.getForWorker(null)).toEqual([]);
    expect(registry.getForWorker("calculator")).toEqual([]);
  });
});
