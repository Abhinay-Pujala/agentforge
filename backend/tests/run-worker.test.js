import { describe, it, expect, vi, beforeEach } from "vitest";

const getWorkerExecutionContextMock = vi.fn();
const createExecutionMock = vi.fn();
const updateExecutionStatusMock = vi.fn();
const executeMock = vi.fn();
const createAgentRuntimeMock = vi.fn();

vi.mock("../src/services/worker-execution.service.js", () => ({
  getWorkerExecutionContext: getWorkerExecutionContextMock,
}));

vi.mock("../src/services/execution.service.js", () => ({
  createExecution: createExecutionMock,
  updateExecutionStatus: updateExecutionStatusMock,
}));

vi.mock("../src/runtime/runtime-instance.js", () => ({
  createAgentRuntime: createAgentRuntimeMock,
}));

vi.mock("../src/runtime/execution-policy.js", () => ({
  validateExecutionPolicy: vi.fn(() => ({
    provider: "openrouter",
    supportedModels: ["test-model", "openai/gpt-4o-mini"],
    timeoutMs: 30_000,
    maxTokens: 2_000,
    maxCost: 0.05,
  })),

  validateExecutionCost: vi.fn((cost) => {
    if (cost > 0.05) {
      const error = new Error(
        "Execution cost exceeded the maximum allowed cost of 0.05",
      );

      error.code = "COST_LIMIT_EXCEEDED";
      error.statusCode = 402;

      throw error;
    }
  }),
}));

const { runWorker } = await import("../src/controllers/worker.controller.js");

describe("runWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getWorkerExecutionContextMock.mockResolvedValue({
      user: {
        _id: "user-123",
      },
      worker: {
        _id: "worker-123",
        model: "openai/gpt-4o-mini",
      },
      context: {
        userId: "user-123",
        workerId: "worker-123",
      },
    });

    createExecutionMock.mockResolvedValue({
      _id: "execution-123",
    });

    createAgentRuntimeMock.mockReturnValue({
      execute: executeMock,
    });
  });

  function createResponse() {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  }

  it("runs an execution through QUEUED → RUNNING → COMPLETED", async () => {
    executeMock.mockResolvedValue({
      output: "Execution completed",
      metadata: {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          cost: 0.0025,
        },
      },
    });

    const req = {
      params: {
        id: "worker-123",
      },
      body: {
        input: "Run this task",
      },
      firebaseUser: {
        uid: "firebase-123",
      },
    };

    const res = createResponse();
    const next = vi.fn();

    await runWorker(req, res, next);

    expect(getWorkerExecutionContextMock).toHaveBeenCalledWith(
      "firebase-123",
      "worker-123",
    );

    expect(createExecutionMock).toHaveBeenCalledWith(
      "user-123",
      "worker-123",
      "Run this task",
      "openai/gpt-4o-mini",
    );

    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(
      1,
      "execution-123",
      expect.objectContaining({
        status: "RUNNING",
        startedAt: expect.any(Date),
      }),
    );

    expect(executeMock).toHaveBeenCalledWith({
      worker: expect.objectContaining({
        _id: "worker-123",
        model: "openai/gpt-4o-mini",
      }),
      input: "Run this task",
      context: {
        userId: "user-123",
        workerId: "worker-123",
      },
      executionPolicy: expect.objectContaining({
        provider: "openrouter",
        timeoutMs: 30_000,
        maxTokens: 2_000,
        maxCost: 0.05,
      }),
    });

    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(
      2,
      "execution-123",
      expect.objectContaining({
        status: "COMPLETED",
        output: "Execution completed",
        startedAt: expect.any(Date),
        completedAt: expect.any(Date),
        durationMs: expect.any(Number),
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
        cost: 0.0025,
      }),
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Worker executed successfully.",
      data: {
        output: "Execution completed",
        metadata: {
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
            cost: 0.0025,
          },
        },
      },
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("marks the execution as FAILED when runtime execution fails", async () => {
    const runtimeError = new Error("Provider request failed");
    runtimeError.statusCode = 500;

    executeMock.mockRejectedValue(runtimeError);

    const req = {
      params: {
        id: "worker-123",
      },
      body: {
        input: "Fail this task",
      },
      firebaseUser: {
        uid: "firebase-123",
      },
    };

    const res = createResponse();
    const next = vi.fn();

    await runWorker(req, res, next);

    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(
      2,
      "execution-123",
      expect.objectContaining({
        status: "FAILED",
        error: {
          message: "Provider request failed",
          code: 500,
        },
        completedAt: expect.any(Date),
        durationMs: expect.any(Number),
      }),
    );

    expect(next).toHaveBeenCalledWith(runtimeError);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("marks the execution as TIMEOUT when runtime execution returns a 504 error", async () => {
    const timeoutError = new Error("Execution timed out");
    timeoutError.statusCode = 504;

    executeMock.mockRejectedValue(timeoutError);

    const req = {
      params: {
        id: "worker-123",
      },
      body: {
        input: "Timeout task",
      },
      firebaseUser: {
        uid: "firebase-123",
      },
    };

    const res = createResponse();
    const next = vi.fn();

    await runWorker(req, res, next);

    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(
      2,
      "execution-123",
      expect.objectContaining({
        status: "TIMEOUT",
        error: {
          message: "Execution timed out",
          code: 504,
        },
        completedAt: expect.any(Date),
        durationMs: expect.any(Number),
      }),
    );

    expect(next).toHaveBeenCalledWith(timeoutError);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("does not update execution status when execution creation fails", async () => {
    const creationError = new Error("Failed to create execution");

    createExecutionMock.mockRejectedValue(creationError);

    const req = {
      params: {
        id: "worker-123",
      },
      body: {
        input: "Creation failure",
      },
      firebaseUser: {
        uid: "firebase-123",
      },
    };

    const res = createResponse();
    const next = vi.fn();

    await runWorker(req, res, next);

    expect(updateExecutionStatusMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(creationError);
  });
  it("marks the execution as FAILED when execution cost exceeds the policy", async () => {
    executeMock.mockResolvedValue({
      success: true,
      output: "Expensive response",
      metadata: {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 500,
          total_tokens: 600,
          cost: 0.08,
        },
      },
    });

    const req = {
      params: {
        id: "worker-123",
      },
      body: {
        input: "Run this task",
      },
      firebaseUser: {
        uid: "firebase-user-123",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await runWorker(req, res, next);

    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(
      2,
      "execution-123",
      expect.objectContaining({
        status: "FAILED",
        output: "Expensive response",
        error: expect.objectContaining({
          code: "COST_LIMIT_EXCEEDED",
        }),
        usage: {
          promptTokens: 100,
          completionTokens: 500,
          totalTokens: 600,
        },
        cost: 0.08,
      }),
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "COST_LIMIT_EXCEEDED",
      }),
    );

    expect(res.status).not.toHaveBeenCalledWith(200);
  });
  it("completes successfully when provider returns no usage or cost metadata", async () => {
    executeMock.mockResolvedValue({
      output: "Execution completed without metadata",
      metadata: {},
    });

    const req = {
      params: {
        id: "worker-123",
      },
      body: {
        input: "Test input",
      },
      firebaseUser: {
        uid: "firebase-123",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    const result = await runWorker(req, res, next);

    expect(result).toBeUndefined();

    expect(updateExecutionStatusMock).toHaveBeenNthCalledWith(
      2,
      "execution-123",
      expect.objectContaining({
        status: "COMPLETED",
        output: "Execution completed without metadata",
        usage: {
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
        },
        cost: null,
      }),
    );

    expect(next).not.toHaveBeenCalled();
  });
});
