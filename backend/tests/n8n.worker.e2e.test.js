import { describe, it, expect, vi, beforeEach } from "vitest";

const getWorkerExecutionContextMock = vi.fn();
const createExecutionMock = vi.fn();
const updateExecutionStatusMock = vi.fn();
const executeWorkerMock = vi.fn();

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

vi.mock("../src/runtime/worker-flow/worker-execution-engine.js", () => ({
  default: class MockWorkerExecutionEngine {
    execute(...args) { return executeWorkerMock(...args); }
  },
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
        workflowCatalog: [{
          id: "workflow-123",
          name: "Gmail Workflow",
          description: "Gmail agent",
          category: "email",
          capabilities: ["email", "gmail", "search", "reply"],
          status: "enabled",
          inputSchema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] },
          webhook: { provider: "n8n", url: "http://localhost:5678/webhook/test" },
        }],
      },
    });

    createExecutionMock.mockResolvedValue({ _id: "execution-123" });

    executeWorkerMock.mockResolvedValue({
      output: "Workflow completed successfully.",
      metadata: { usage: { total_tokens: 10, cost: 0.001 }, mode: "workflow" },
      workflow: { workflowId: "workflow-123", data: { input: "Trigger Gmail workflow" } },
      toolCalls: [],
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
