import { describe, it, expect, vi, beforeEach } from "vitest";

import AgentRuntime from "../src/runtime/agent-runtime.service.js";
import ToolRegistry from "../src/tools/tool-registry.js";

describe("AgentRuntime tool capabilities", () => {
  const calculatorTool = {
    name: "calculator",
    description: "Perform calculations.",
    schema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
        },
      },
      required: ["expression"],
    },
    execute: vi.fn(),
  };

  const githubTool = {
    name: "github",
    description: "Interact with GitHub.",
    schema: {},
    execute: vi.fn(),
  };

  let modelProvider;
  let toolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();

    modelProvider = {
      generate: vi.fn().mockResolvedValue({
        output: "Test response",
        metadata: {},
      }),
    };

    toolRegistry = {
      list: vi.fn().mockReturnValue([]),
      get: vi.fn(),
      getForWorker: vi.fn().mockReturnValue([]),
    };
  });

  function createWorker(enabledTools = []) {
    return {
      _id: "worker-123",
      name: "Test Worker",
      instructions: "Complete the task.",
      model: "test-model",
      configuration: {},
      enabledTools,
    };
  }

  it("passes only worker-enabled tools to the model provider", async () => {
    toolRegistry.getForWorker.mockReturnValue([calculatorTool]);

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    await runtime.execute({
      worker: createWorker(["calculator"]),
      input: "Calculate 2 + 2",
    });

    expect(toolRegistry.getForWorker).toHaveBeenCalledWith(["calculator"]);

    expect(modelProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [calculatorTool],
      }),
    );
  });

  it("passes no tools when the worker has no enabled tools", async () => {
    toolRegistry.getForWorker.mockReturnValue([]);

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    await runtime.execute({
      worker: createWorker([]),
      input: "Say hello",
    });

    expect(toolRegistry.getForWorker).toHaveBeenCalledWith([]);

    expect(modelProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [],
      }),
    );
  });

  it("does not expose tools that the registry does not return", async () => {
    toolRegistry.getForWorker.mockReturnValue([calculatorTool]);

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    await runtime.execute({
      worker: createWorker(["calculator", "github"]),
      input: "Calculate something",
    });

    expect(modelProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [calculatorTool],
      }),
    );

    expect(modelProvider.generate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.arrayContaining([githubTool]),
      }),
    );
  });

  it("defaults to no tools when enabledTools is missing", async () => {
    toolRegistry.getForWorker.mockReturnValue([]);

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    await runtime.execute({
      worker: createWorker(),
      input: "Say hello",
    });

    expect(toolRegistry.getForWorker).toHaveBeenCalledWith([]);

    expect(modelProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [],
      }),
    );
  });

  it("preserves normal runtime output", async () => {
    toolRegistry.getForWorker.mockReturnValue([calculatorTool]);

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    const result = await runtime.execute({
      worker: createWorker(["calculator"]),
      input: "Calculate 2 + 2",
    });

    expect(result).toEqual({
      success: true,
      output: "Test response",
      metadata: {},
    });
  });
  it("accepts valid tool call arguments", async () => {
    const tool = {
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

    const toolRegistry = new ToolRegistry();
    toolRegistry.register(tool);

    const modelProvider = {
      generate: vi
        .fn()
        .mockResolvedValueOnce({
          output: null,
          toolCalls: [
            {
              id: "call-1",
              tool: "calculator",
              arguments: {
                expression: "125 * 48",
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          output: "6000",
          toolCalls: [],
          metadata: {},
        }),
    };

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    const result = await runtime.execute({
      worker: {
        model: "test-model",
        instructions: "Use tools when appropriate.",
        enabledTools: ["calculator"],
        configuration: {},
      },
      input: "What is 125 * 48?",
    });

    expect(result.output).toBe("6000");

    expect(tool.execute).toHaveBeenCalledWith({
      expression: "125 * 48",
    });

    expect(modelProvider.generate).toHaveBeenCalledTimes(2);
  });
  it("rejects invalid tool call arguments", async () => {
    const tool = {
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
      execute: vi.fn(),
    };

    const toolRegistry = new ToolRegistry();
    toolRegistry.register(tool);

    const modelProvider = {
      generate: vi.fn().mockResolvedValue({
        output: null,
        toolCalls: [
          {
            id: "call-1",
            tool: "calculator",
            arguments: {
              expression: 125,
            },
          },
        ],
      }),
    };

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    await expect(
      runtime.execute({
        worker: {
          model: "test-model",
          instructions: "Use tools when appropriate.",
          enabledTools: ["calculator"],
          configuration: {},
        },
        input: "Calculate 125.",
      }),
    ).rejects.toThrow("Invalid arguments for tool calculator");

    expect(tool.execute).not.toHaveBeenCalled();
  });
  it("rejects unknown tool calls", async () => {
    const toolRegistry = new ToolRegistry();

    const modelProvider = {
      generate: vi.fn().mockResolvedValue({
        output: null,
        toolCalls: [
          {
            id: "call-1",
            tool: "unknown-tool",
            arguments: {},
          },
        ],
      }),
    };

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    await expect(
      runtime.execute({
        worker: {
          model: "test-model",
          instructions: "Use tools when appropriate.",
          enabledTools: [],
          configuration: {},
        },
        input: "Use the unknown tool.",
      }),
    ).rejects.toThrow("Tool not found: unknown-tool");
  });
  it("executes a tool and returns the model's final response", async () => {
    const calculator = {
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

    const toolRegistry = new ToolRegistry();
    toolRegistry.register(calculator);

    const modelProvider = {
      generate: vi
        .fn()
        .mockResolvedValueOnce({
          output: null,
          toolCalls: [
            {
              id: "call-1",
              tool: "calculator",
              arguments: {
                expression: "125 * 48",
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          output: "125 × 48 = 6000.",
          toolCalls: [],
          metadata: {
            provider: "test",
          },
        }),
    };

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    const result = await runtime.execute({
      worker: {
        model: "test-model",
        instructions: "Use tools when appropriate.",
        enabledTools: ["calculator"],
        configuration: {},
      },
      input: "What is 125 × 48?",
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe("125 × 48 = 6000.");

    expect(result.toolCalls).toHaveLength(1);

    expect(result.toolCalls[0]).toMatchObject({
      id: "call-1",
      tool: "calculator",
      arguments: {
        expression: "125 * 48",
      },
      result: {
        expression: "125 * 48",
        result: 6000,
      },
      status: "COMPLETED",
    });

    expect(result.toolCalls[0].durationMs).toBeTypeOf("number");

    expect(calculator.execute).toHaveBeenCalledWith({
      expression: "125 * 48",
    });

    expect(modelProvider.generate).toHaveBeenCalledTimes(2);

    const secondRequest = modelProvider.generate.mock.calls[1][0];

    expect(secondRequest.messages).toContainEqual({
      role: "tool",
      tool_call_id: "call-1",
      content: JSON.stringify({
        expression: "125 * 48",
        result: 6000,
      }),
    });
  });
  it("stops after the maximum number of tool rounds", async () => {
    const calculator = {
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
        result: 6000,
      }),
    };

    const toolRegistry = new ToolRegistry();
    toolRegistry.register(calculator);

    const modelProvider = {
      generate: vi.fn().mockResolvedValue({
        output: null,
        toolCalls: [
          {
            id: "call-loop",
            tool: "calculator",
            arguments: {
              expression: "125 * 48",
            },
          },
        ],
      }),
    };

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    await expect(
      runtime.execute({
        worker: {
          model: "test-model",
          instructions: "Use tools.",
          enabledTools: ["calculator"],
          configuration: {},
        },
        input: "Calculate this.",
        executionPolicy: {
          maxToolRounds: 2,
        },
      }),
    ).rejects.toThrow("Maximum tool execution rounds exceeded: 2");

    expect(modelProvider.generate).toHaveBeenCalledTimes(3);
    expect(calculator.execute).toHaveBeenCalledTimes(2);
  });
  it("records failed tool calls before propagating the error", async () => {
    const calculator = {
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
      execute: vi.fn().mockRejectedValue(new Error("Calculator failed")),
    };

    const toolRegistry = new ToolRegistry();
    toolRegistry.register(calculator);

    const modelProvider = {
      generate: vi.fn().mockResolvedValue({
        output: null,
        toolCalls: [
          {
            id: "call-failure",
            tool: "calculator",
            arguments: {
              expression: "125 * 48",
            },
          },
        ],
      }),
    };

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    await expect(
      runtime.execute({
        worker: {
          model: "test-model",
          instructions: "Use tools.",
          enabledTools: ["calculator"],
          configuration: {},
        },
        input: "Calculate this.",
      }),
    ).rejects.toThrow("Calculator failed");
  });
});
