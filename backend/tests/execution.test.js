import { describe, it, expect, vi, beforeEach } from "vitest";

const executionMock = {
  create: vi.fn(),
  findOneAndUpdate: vi.fn(),
  find: vi.fn(),
  countDocuments: vi.fn(),
  findOne: vi.fn(),
};

vi.mock("../src/models/execution.model.js", () => ({
  default: executionMock,
}));

const {
  createExecution,
  updateExecutionStatus,
  getExecutions,
  getExecutionById,
} = await import("../src/services/execution.service.js");

describe("Execution Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an execution with the correct data", async () => {
    const userId = "user-123";
    const workerId = "worker-123";
    const input = "Run this task";
    const model = "test-model";

    const createdExecution = {
      _id: "execution-123",
      user: userId,
      worker: workerId,
      input,
      model,
      status: "QUEUED",
    };

    executionMock.create.mockResolvedValue(createdExecution);

    const result = await createExecution(userId, workerId, input, model);

    expect(executionMock.create).toHaveBeenCalledWith({
      user: userId,
      worker: workerId,
      input,
      model,
    });

    expect(result).toEqual(createdExecution);
  });

  it("updates an execution status", async () => {
    const executionId = "execution-123";

    const updatedExecution = {
      _id: executionId,
      status: "RUNNING",
    };

    executionMock.findOneAndUpdate.mockResolvedValue(updatedExecution);

    const result = await updateExecutionStatus(executionId, {
      status: "RUNNING",
      startedAt: new Date(),
    });

    expect(executionMock.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: executionId,
      },
      expect.objectContaining({
        status: "RUNNING",
      }),
      {
        new: true,
      },
    );

    expect(result).toEqual(updatedExecution);
  });

  it("gets executions scoped to the authenticated user", async () => {
    const userId = "user-123";

    const executions = [
      {
        _id: "execution-1",
        user: userId,
        status: "COMPLETED",
      },
    ];

    const queryChain = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(executions),
    };

    executionMock.find.mockReturnValue(queryChain);
    executionMock.countDocuments.mockResolvedValue(1);

    const result = await getExecutions({
      userId,
      page: 1,
      limit: 20,
    });

    expect(executionMock.find).toHaveBeenCalledWith({
      user: userId,
    });

    expect(executionMock.countDocuments).toHaveBeenCalledWith({
      user: userId,
    });

    expect(result.executions).toEqual(executions);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("applies worker, status, and date filters", async () => {
    const userId = "user-123";
    const workerId = "worker-123";
    const from = new Date("2026-09-01T00:00:00.000Z");
    const to = new Date("2026-09-02T23:59:59.999Z");

    const queryChain = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    executionMock.find.mockReturnValue(queryChain);
    executionMock.countDocuments.mockResolvedValue(0);

    await getExecutions({
      userId,
      workerId,
      status: "COMPLETED",
      from,
      to,
      page: 1,
      limit: 20,
    });

    const expectedQuery = {
      user: userId,
      worker: workerId,
      status: "COMPLETED",
      createdAt: {
        $gte: from,
        $lte: to,
      },
    };

    expect(executionMock.find).toHaveBeenCalledWith(expectedQuery);
    expect(executionMock.countDocuments).toHaveBeenCalledWith(expectedQuery);
  });

  it("gets an execution only when it belongs to the authenticated user", async () => {
    const executionId = "execution-123";
    const userId = "user-123";

    const execution = {
      _id: executionId,
      user: userId,
      status: "COMPLETED",
    };

    executionMock.findOne.mockReturnValue({
      populate: vi.fn().mockResolvedValue(execution),
    });

    const result = await getExecutionById(executionId, userId);

    expect(executionMock.findOne).toHaveBeenCalledWith({
      _id: executionId,
      user: userId,
    });

    expect(result).toEqual(execution);
  });
});
