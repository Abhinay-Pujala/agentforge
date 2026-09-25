import { describe, it, expect, vi, beforeEach } from "vitest";

const getWorkerExecutionContextMock = vi.fn();
const createExecutionMock = vi.fn();
const updateExecutionStatusMock = vi.fn();
const createAgentRuntimeMock = vi.fn();

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

vi.mock("../src/runtime/runtime-instance.js", () => ({
  createAgentRuntime: createAgentRuntimeMock,
}));

const { runWorker } = await import("../src/controllers/worker.controller.js");

describe("Worker → AgentRuntime → n8n → execution history", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getWorkerExecutionContextMock.mockResolvedValue({
      user: { _id: "user-123" },
      worker: {
        _id: "worker-123",
        model: "test-model",
        workflowIds: ["workflow-123"],
      },
      context: {
        userId: "user-123",
        workerId: "worker-123",
      },
    });

    createExecutionMock.mockResolvedValue({ _id: "execution-123" });

    createAgentRuntimeMock.mockReturnValue({
      execute: vi.fn().mockResolvedValue({
        output: "Workflow completed successfully.",
        metadata: { usage: { total_tokens: 10, cost: 0.001 } },
        toolCalls: [{
          id: "n8n-call-1",
          tool: "n8n.trigger",
          status: "COMPLETED",
          result: { success: true },
        }],
      }),
    });
  });

  it("persists a successful registered-workflow execution", async () => {
    const req = {
      params: { id: "worker-123" },
      body: { input: "Trigger Gmail workflow" },
      firebaseUser: { uid: "firebase-123" },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await runWorker(req, res, next);

    expect(createExecutionMock).toHaveBeenCalled();
    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(
      2,
      "execution-123",
      expect.objectContaining({
        status: "COMPLETED",
        output: "Workflow completed successfully.",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
