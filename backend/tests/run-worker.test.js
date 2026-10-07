import { describe, it, expect, vi, beforeEach } from "vitest";

const getWorkerExecutionContextMock = vi.fn();
const createExecutionMock = vi.fn();
const updateExecutionStatusMock = vi.fn();
const executeMock = vi.fn();

vi.mock("../src/services/worker-execution.service.js", () => ({ getWorkerExecutionContext: getWorkerExecutionContextMock }));
vi.mock("../src/services/execution.service.js", () => ({
  createExecution: createExecutionMock,
  updateExecutionStatus: updateExecutionStatusMock,
}));
vi.mock("../src/runtime/worker-flow/worker-execution-engine.js", () => ({
  default: vi.fn().mockImplementation(() => ({ execute: executeMock })),
}));
vi.mock("../src/runtime/execution-policy.js", () => ({
  validateExecutionPolicy: vi.fn(() => ({ provider: "openrouter", timeoutMs: 30000, maxTokens: 2000, maxCost: 0.05 })),
  validateExecutionCost: vi.fn(),
}));

const { runWorker } = await import("../src/controllers/worker.controller.js");

describe("runWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWorkerExecutionContextMock.mockResolvedValue({
      user: { _id: "user-123" },
      worker: { _id: "worker-123", model: "test-model", name: "Assistant" },
      context: { userId: "user-123", workerId: "worker-123", workflowCatalog: [] },
    });
    createExecutionMock.mockResolvedValue({ _id: "execution-123" });
  });

  const req = () => ({
    params: { id: "worker-123" },
    body: { input: "Run this task" },
    firebaseUser: { uid: "firebase-123" },
  });
  const res = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });

  it("persists QUEUED -> RUNNING -> COMPLETED", async () => {
    executeMock.mockResolvedValue({ output: "done", metadata: {}, workflow: null, toolCalls: [] });
    const response = res();
    const next = vi.fn();

    await runWorker(req(), response, next);

    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(1, "execution-123", expect.objectContaining({ status: "RUNNING" }));
    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(2, "execution-123", expect.objectContaining({
      status: "COMPLETED", output: "done", toolCalls: [],
    }));
    expect(response.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("marks n8n timeout as TIMEOUT", async () => {
    const error = new Error("timed out");
    error.code = "N8N_TIMEOUT";
    error.statusCode = 504;
    executeMock.mockRejectedValue(error);
    const response = res();
    const next = vi.fn();

    await runWorker(req(), response, next);

    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(2, "execution-123", expect.objectContaining({ status: "TIMEOUT" }));
    expect(next).toHaveBeenCalledWith(error);
  });
});
