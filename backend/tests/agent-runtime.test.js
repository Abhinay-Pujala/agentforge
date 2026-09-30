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


  it("does not expose n8n to ordinary conversation", async () => {
    const n8nTool = {
      name: "n8n.trigger",
      description: "Trigger a registered workflow.",
      schema: {
        type: "object",
        properties: {
          workflowId: { type: "string" },
          data: { type: "object" },
        },
        required: ["workflowId", "data"],
      },
      execute: vi.fn(),
    };

    const registry = new ToolRegistry();
    registry.register(n8nTool);

    const modelProvider = {
      generate: vi.fn().mockResolvedValue({
        output: "Hi! I can help you.",
        toolCalls: [],
        metadata: {},
      }),
    };

    const runtime = new AgentRuntime(modelProvider, registry);

    const result = await runtime.execute({
      worker: {
        model: "test-model",
        instructions: "Be helpful.",
        enabledTools: ["n8n.trigger"],
        permissions: ["n8n.trigger"],
        workflowIds: ["workflow-email"],
        configuration: {},
      },
      input: "Hi, what can you do?",
      context: {
        workflowCatalog: [
          {
            id: "workflow-email",
            name: "Email Automation",
            description: "Send an email.",
            category: "email",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
        ],
      },
    });

    expect(result.output).toBe("Hi! I can help you.");
    expect(n8nTool.execute).not.toHaveBeenCalled();
    expect(n8nTool.execute).not.toHaveBeenCalled();
  });

  it("executes the single registered workflow once and accepts a polished email body", async () => {
    const n8nTool = {
      name: "n8n.trigger",
      description: "Trigger a registered n8n workflow.",
      schema: {
        type: "object",
        properties: {
          workflowId: { type: "string" },
          data: { type: "object", additionalProperties: true },
        },
        required: ["workflowId", "data"],
        additionalProperties: false,
      },
      execute: vi.fn().mockResolvedValue({
        success: true,
        status: "SENT",
        message: "Email sent successfully",
      }),
    };

    const toolRegistry = new ToolRegistry();
    toolRegistry.register(n8nTool);

    const modelProvider = {
      generate: vi
        .fn()
        .mockResolvedValueOnce({
          output: null,
          toolCalls: [
            {
              id: "n8n-call-1",
              tool: "n8n.trigger",
              arguments: {
                workflowId: "workflow-email",
                data: {
                  to: "abhinay200711@gmail.com",
                  subject: "Project Submission Update",
                  message:
                    "Hi, I’ll submit the project tomorrow. Best regards, Abhinay.",
                },
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          output: "Email sent successfully.",
          toolCalls: [],
          metadata: {},
        }),
    };

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    const result = await runtime.execute({
      worker: {
        model: "test-model",
        instructions: "Use the email workflow when appropriate.",
        enabledTools: ["n8n.trigger"],
        configuration: {},
      },
      input:
        "Send an email to abhinay200711@gmail.com saying I'll submit the project tomorrow.",
      context: {
        workflowCatalog: [
          {
            id: "workflow-email",
            name: "Email Automation",
            description: "Send an email.",
            category: "automation",
            inputSchema: {
              type: "object",
              properties: {
                to: { type: "string" },
                subject: { type: "string" },
                message: { type: "string" },
              },
              required: ["to", "subject", "message"],
              additionalProperties: false,
            },
          },
        ],
      },
    });

    expect(result.output).toBe("Email sent successfully.");
    expect(result.metadata.inputRequired).toBeUndefined();
    expect(result.toolCalls).toHaveLength(1);
    expect(n8nTool.execute).toHaveBeenCalledTimes(1);
    expect(modelProvider.generate).toHaveBeenCalledTimes(2);
  });

  it("merges pending workflow state and resumed input before execution", async () => {
    const n8nTool = {
      name: "n8n.trigger",
      description: "Trigger a registered n8n workflow.",
      schema: {
        type: "object",
        properties: {
          workflowId: { type: "string" },
          data: { type: "object", additionalProperties: true },
        },
        required: ["workflowId", "data"],
        additionalProperties: false,
      },
      execute: vi.fn().mockResolvedValue({
        success: true,
        status: "SENT",
        message: "Workflow completed successfully",
      }),
    };

    const registry = new ToolRegistry();
    registry.register(n8nTool);

    const modelProvider = {
      generate: vi
        .fn()
        .mockResolvedValueOnce({
          output: null,
          toolCalls: [
            {
              id: "resume-call-1",
              tool: "n8n.trigger",
              arguments: {
                workflowId: "workflow-email",
                data: {},
              },
            },
          ],
          metadata: {},
        })
        .mockResolvedValueOnce({
          output: "Workflow completed successfully.",
          toolCalls: [],
          metadata: {},
        }),
    };

    const runtime = new AgentRuntime(modelProvider, registry);

    const result = await runtime.execute({
      worker: {
        model: "test-model",
        instructions: "Use the registered workflow.",
        enabledTools: ["n8n.trigger"],
        permissions: ["n8n.trigger"],
        workflowIds: ["workflow-email"],
        configuration: {},
      },
      input: "Original request: Send an email to user@example.com",
      context: {
        workflowCatalog: [
          {
            id: "workflow-email",
            name: "Email Automation",
            description: "Send an email.",
            category: "automation",
            inputSchema: {
              type: "object",
              properties: {
                to: { type: "string" },
                message: { type: "string" },
              },
              required: ["to", "message"],
            },
          },
        ],
        pendingWorkflowData: {
          to: "user@example.com",
        },
        explicitWorkflowInput: {
          message: "Hello from the user",
        },
        resumedFromExecutionId: "execution-123",
        originalUserInput:
          "Send an email to user@example.com\nHello from the user",
      },
    });

    expect(result.success).toBe(true);
    expect(n8nTool.execute).toHaveBeenCalledWith(
      {
        workflowId: "workflow-email",
        data: {
          to: "user@example.com",
          message: "Hello from the user",
        },
      },
      expect.any(Object),
    );
  });

  it("pauses immediately when the single workflow has missing required input", async () => {
    const n8nTool = {
      name: "n8n.trigger",
      description: "Trigger a registered n8n workflow.",
      schema: {
        type: "object",
        properties: {
          workflowId: { type: "string" },
          data: { type: "object", additionalProperties: true },
        },
        required: ["workflowId", "data"],
        additionalProperties: false,
      },
      execute: vi.fn().mockResolvedValue({
        status: "INPUT_REQUIRED",
        workflowId: "workflow-email",
        workflowName: "Email Automation",
        missingFields: ["message"],
        validationErrors: ["arguments.message is required"],
        message: "Additional workflow input is required before this workflow can run.",
      }),
    };

    const toolRegistry = new ToolRegistry();
    toolRegistry.register(n8nTool);

    const modelProvider = {
      generate: vi.fn().mockResolvedValue({
        output: null,
        toolCalls: [
          {
            id: "n8n-call-1",
            tool: "n8n.trigger",
            arguments: {
              workflowId: "workflow-email",
              data: {
                to: "abhinay200711@gmail.com",
                subject: "Project Update",
              },
            },
          },
        ],
      }),
    };

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    const result = await runtime.execute({
      worker: {
        model: "test-model",
        instructions: "Use the email workflow when appropriate.",
        enabledTools: ["n8n.trigger"],
        configuration: {},
      },
      input: "Send an email to abhinay200711@gmail.com",
      context: {
        workflowCatalog: [
          {
            id: "workflow-email",
            name: "Email Automation",
            description: "Send an email.",
            category: "automation",
            inputSchema: {
              type: "object",
              properties: {
                to: { type: "string" },
                subject: { type: "string" },
                message: { type: "string" },
              },
              required: ["to", "subject", "message"],
              additionalProperties: false,
            },
          },
        ],
      },
    });

    expect(result.metadata.inputRequired).toMatchObject({
      workflowId: "workflow-email",
      missingFields: ["message"],
      validationErrors: ["arguments.message is required"],
    });
    expect(result.toolCalls).toHaveLength(1);
    expect(modelProvider.generate).toHaveBeenCalledTimes(1);
    expect(n8nTool.execute).toHaveBeenCalledTimes(1);
  });
  it("does not retry indefinitely when resumed input remains unresolved", async () => {
    const n8nTool = {
      name: "n8n.trigger",
      description: "Trigger a registered workflow.",
      schema: {
        type: "object",
        properties: {
          workflowId: { type: "string" },
          data: { type: "object", additionalProperties: true },
        },
        required: ["workflowId", "data"],
      },
      execute: vi.fn().mockResolvedValue({
        status: "INPUT_REQUIRED",
        workflowId: "workflow-email",
        workflowName: "Email Automation",
        missingFields: ["message"],
        validationErrors: ["arguments.message is required"],
      }),
    };

    const registry = new ToolRegistry();
    registry.register(n8nTool);

    const modelProvider = {
      generate: vi.fn().mockResolvedValue({
        output: null,
        toolCalls: [{
          id: "resume-call-1",
          tool: "n8n.trigger",
          arguments: {
            workflowId: "workflow-email",
            data: { to: "user@example.com" },
          },
        }],
      }),
    };

    const runtime = new AgentRuntime(modelProvider, registry);

    const result = await runtime.execute({
      worker: {
        model: "test-model",
        instructions: "Send email using the registered workflow.",
        enabledTools: ["n8n.trigger"],
        permissions: ["n8n.trigger"],
        workflowIds: ["workflow-email"],
        configuration: {},
      },
      input: `Original request:
Send an email to user@example.com

User provided additional information:
Birthday wishes`,
      context: {
        workflowCatalog: [{
          id: "workflow-email",
          name: "Email Automation",
          inputSchema: {
            type: "object",
            properties: {
              to: { type: "string" },
              message: { type: "string" },
            },
            required: ["to", "message"],
          },
        }],
        explicitWorkflowInput: { message: "Birthday wishes" },
        pendingWorkflowData: { to: "user@example.com" },
        resumedFromExecutionId: "execution-123",
        originalUserInput: `Send an email to user@example.com
Birthday wishes`,
      },
    });

    expect(result.success).toBe(true);
    expect(result.metadata.inputRequired).toMatchObject({
      missingFields: ["message"],
    });
    expect(n8nTool.execute).toHaveBeenCalledTimes(1);
    expect(modelProvider.generate).toHaveBeenCalledTimes(1);
  });
