import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const getWorkerExecutionContextMock = vi.fn();
const createExecutionMock = vi.fn();
const updateExecutionStatusMock = vi.fn();

vi.mock("../src/services/worker-execution.service.js", () => ({
  getWorkerExecutionContext: getWorkerExecutionContextMock,
}));

vi.mock("../src/services/execution.service.js", () => ({
  createExecution: createExecutionMock,
  updateExecutionStatus: updateExecutionStatusMock,
}));

vi.mock("../src/runtime/execution-policy.js", () => ({
  validateExecutionPolicy: vi.fn(() => ({
    provider: "openrouter",
    supportedModels: ["test-model"],
    timeoutMs: 30_000,
    toolTimeoutMs: 10_000,
    maxTokens: 2_000,
    maxCost: 0.05,
    maxToolRounds: 5,
  })),

  validateExecutionCost: vi.fn(),
}));

let runWorker;
let AgentRuntime;
let ToolRegistry;
let n8nTriggerTool;

describe("Worker → AgentRuntime → n8n → execution history", () => {
  beforeAll(async () => {
    vi.stubEnv("N8N_BASE_URL", "http://localhost:5678");
    vi.stubEnv("N8N_WORKFLOW_AGENTFORGE_TEST", "webhook/agentforge/test");
    vi.stubEnv("N8N_WEBHOOK_SECRET", "test-agentforge-secret");

    ({ runWorker } = await import("../src/controllers/worker.controller.js"));

    ({ default: AgentRuntime } =
      await import("../src/runtime/agent-runtime.service.js"));

    ({ default: ToolRegistry } = await import("../src/tools/tool-registry.js"));

    ({ n8nTriggerTool } = await import("../src/tools/n8n-trigger.tool.js"));
  });

  beforeEach(() => {
    vi.clearAllMocks();

    getWorkerExecutionContextMock.mockResolvedValue({
      user: {
        _id: "user-123",
      },

      worker: {
        _id: "worker-123",
        model: "test-model",
        instructions: "Use the n8n workflow when requested.",
        enabledTools: ["n8n.trigger"],
        permissions: ["n8n.trigger"],
        configuration: {
          n8n: {
            workflow: "agentforge-test",
          },
        },
      },

      context: {
        userId: "user-123",
        workerId: "worker-123",
        worker: {
          _id: "worker-123",
          model: "test-model",
          instructions: "Use the n8n workflow when requested.",
          enabledTools: ["n8n.trigger"],
          permissions: ["n8n.trigger"],
          configuration: {
            n8n: {
              workflow: "agentforge-test",
            },
          },
        },
      },
    });

    createExecutionMock.mockResolvedValue({
      _id: "execution-123",
    });
  });

  function createResponse() {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  }

  it("executes n8n through the real runtime and persists the result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          success: true,
          result: {
            message: "Hello from n8n",
            workflow: "agentforge-test",
          },
        }),
      ),
    });

    const toolRegistry = new ToolRegistry();
    toolRegistry.register(n8nTriggerTool);

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
                workflow: "agentforge-test",
                data: {
                  message: "Hello from Worker",
                },
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          output: "Workflow completed successfully.",
          toolCalls: [],
          metadata: {
            provider: "test",
          },
        }),
    };

    const runtime = new AgentRuntime(modelProvider, toolRegistry);

    const req = {
      params: {
        id: "worker-123",
      },

      body: {
        input: "Trigger the test workflow",
      },

      firebaseUser: {
        uid: "firebase-123",
      },
    };

    const res = createResponse();
    const next = vi.fn();

    const originalCreateAgentRuntime =
      await import("../src/runtime/runtime-instance.js");

    vi.spyOn(originalCreateAgentRuntime, "createAgentRuntime").mockReturnValue(
      runtime,
    );

    await runWorker(req, res, next);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5678/webhook/agentforge/test",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-AgentForge-Secret": "test-agentforge-secret",
        }),
      }),
    );

    const requestOptions = fetchMock.mock.calls[0][1];
    const requestBody = JSON.parse(requestOptions.body);

    expect(requestBody).toMatchObject({
      workflow: "agentforge-test",
      data: {
        message: "Hello from Worker",
      },
      agentforge: {
        workerId: "worker-123",
        executionId: "execution-123",
      },
    });

    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(
      2,
      "execution-123",
      expect.objectContaining({
        status: "COMPLETED",
        output: "Workflow completed successfully.",
        toolCalls: [
          expect.objectContaining({
            id: "n8n-call-1",
            tool: "n8n.trigger",
            status: "COMPLETED",
            result: expect.objectContaining({
              success: true,
            }),
          }),
        ],
      }),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
