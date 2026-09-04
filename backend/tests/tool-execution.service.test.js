import { describe, expect, it, vi } from "vitest";

import ToolExecutionService from "../src/tools/tool-execution.service.js";
import ToolRegistry from "../src/tools/tool-registry.js";

const calculatorTool = {
  name: "calculator",
  description: "Perform basic arithmetic calculations.",
  schema: {
    type: "object",
    properties: {
      expression: {
        type: "string",
      },
    },
    required: ["expression"],
    additionalProperties: false,
  },
  execute: vi.fn().mockResolvedValue({
    expression: "125 * 48",
    result: 6000,
  }),
};

function createService(tool = calculatorTool) {
  const registry = new ToolRegistry();
  registry.register(tool);

  return new ToolExecutionService(registry);
}

describe("ToolExecutionService", () => {
  it("executes a valid tool call", async () => {
    const service = createService();

    const result = await service.execute({
      toolName: "calculator",
      arguments: {
        expression: "125 * 48",
      },
    });

    expect(result).toEqual({
      expression: "125 * 48",
      result: 6000,
    });

    expect(calculatorTool.execute).toHaveBeenCalledWith({
      expression: "125 * 48",
    });
  });

  it("rejects unknown tools", async () => {
    const service = createService();

    await expect(
      service.execute({
        toolName: "unknown-tool",
        arguments: {},
      }),
    ).rejects.toThrow("Tool not found: unknown-tool");
  });

  it("rejects invalid arguments before execution", async () => {
    const execute = vi.fn();

    const tool = {
      ...calculatorTool,
      execute,
    };

    const service = createService(tool);

    await expect(
      service.execute({
        toolName: "calculator",
        arguments: {
          expression: 125,
        },
      }),
    ).rejects.toThrow("Invalid arguments for tool calculator");

    expect(execute).not.toHaveBeenCalled();
  });

  it("returns tool execution failures", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("Calculator failed"));

    const service = createService({
      ...calculatorTool,
      execute,
    });

    await expect(
      service.execute({
        toolName: "calculator",
        arguments: {
          expression: "125 * 48",
        },
      }),
    ).rejects.toThrow("Calculator failed");
  });

  it("times out long-running tools", async () => {
    const execute = vi.fn(
      () =>
        new Promise(() => {
          // Intentionally never resolves.
        }),
    );

    const service = createService({
      ...calculatorTool,
      execute,
    });

    await expect(
      service.execute({
        toolName: "calculator",
        arguments: {
          expression: "125 * 48",
        },
        timeoutMs: 20,
      }),
    ).rejects.toMatchObject({
      message: "Tool execution timed out: calculator",
      code: "TOOL_TIMEOUT",
    });
  });
  it("executes a tool when the required permission is granted", async () => {
    const tool = {
      name: "calculator",
      description: "Calculator",
      permission: "calculator.execute",
      schema: {
        type: "object",
        properties: {
          expression: {
            type: "string",
          },
        },
        required: ["expression"],
        additionalProperties: false,
      },
      execute: vi.fn().mockResolvedValue({
        result: 6000,
      }),
    };

    const registry = new ToolRegistry();
    registry.register(tool);

    const service = new ToolExecutionService(registry);

    const result = await service.execute({
      toolName: "calculator",
      arguments: {
        expression: "125 * 48",
      },
      permissions: ["calculator.execute"],
    });

    expect(result).toEqual({
      result: 6000,
    });

    expect(tool.execute).toHaveBeenCalledWith({
      expression: "125 * 48",
    });
  });

  it("rejects tool execution when the required permission is missing", async () => {
    const tool = {
      name: "calculator",
      description: "Calculator",
      permission: "calculator.execute",
      schema: {
        type: "object",
        properties: {
          expression: {
            type: "string",
          },
        },
        required: ["expression"],
        additionalProperties: false,
      },
      execute: vi.fn(),
    };

    const registry = new ToolRegistry();
    registry.register(tool);

    const service = new ToolExecutionService(registry);

    await expect(
      service.execute({
        toolName: "calculator",
        arguments: {
          expression: "125 * 48",
        },
        permissions: [],
      }),
    ).rejects.toMatchObject({
      message: "Permission denied for tool: calculator",
      code: "TOOL_PERMISSION_DENIED",
    });

    expect(tool.execute).not.toHaveBeenCalled();
  });
});
