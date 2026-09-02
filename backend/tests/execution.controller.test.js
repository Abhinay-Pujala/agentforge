import { describe, it, expect, vi, beforeEach } from "vitest";

const userMock = {
  findOne: vi.fn(),
};

const executionServiceMock = {
  getExecutions: vi.fn(),
  getExecutionById: vi.fn(),
};

vi.mock("../src/models/user.model.js", () => ({
  default: userMock,
}));

vi.mock("../src/services/execution.service.js", () => executionServiceMock);

const { getExecutionHistory, getExecution } =
  await import("../src/controllers/execution.controller.js");

describe("Execution Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createResponse() {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    return res;
  }

  it("returns execution history for an authenticated user", async () => {
    const user = {
      _id: "user-123",
      firebaseUid: "firebase-123",
    };

    userMock.findOne.mockResolvedValue(user);

    executionServiceMock.getExecutions.mockResolvedValue({
      executions: [
        {
          _id: "execution-123",
          status: "COMPLETED",
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    const req = {
      firebaseUser: {
        uid: "firebase-123",
      },
      query: {},
    };

    const res = createResponse();
    const next = vi.fn();

    await getExecutionHistory(req, res, next);

    expect(userMock.findOne).toHaveBeenCalledWith({
      firebaseUid: "firebase-123",
    });

    expect(executionServiceMock.getExecutions).toHaveBeenCalledWith({
      userId: "user-123",
      workerId: undefined,
      status: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      limit: 20,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Execution history fetched successfully.",
      data: [
        {
          _id: "execution-123",
          status: "COMPLETED",
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("passes worker, status, date, and pagination filters to the service", async () => {
    userMock.findOne.mockResolvedValue({
      _id: "user-123",
      firebaseUid: "firebase-123",
    });

    executionServiceMock.getExecutions.mockResolvedValue({
      executions: [],
      pagination: {
        page: 2,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    const req = {
      firebaseUser: {
        uid: "firebase-123",
      },
      query: {
        workerId: "worker-123",
        status: "COMPLETED",
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-02T23:59:59.999Z",
        page: "2",
        limit: "10",
      },
    };

    const res = createResponse();
    const next = vi.fn();

    await getExecutionHistory(req, res, next);

    expect(executionServiceMock.getExecutions).toHaveBeenCalledWith({
      userId: "user-123",
      workerId: "worker-123",
      status: "COMPLETED",
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-02T23:59:59.999Z",
      page: 2,
      limit: 10,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 404 when the authenticated user does not exist", async () => {
    userMock.findOne.mockResolvedValue(null);

    const req = {
      firebaseUser: {
        uid: "unknown-user",
      },
      query: {},
    };

    const res = createResponse();
    const next = vi.fn();

    await getExecutionHistory(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found. Please sync your account first.",
      data: null,
    });

    expect(executionServiceMock.getExecutions).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("returns an execution detail for an authenticated user", async () => {
    userMock.findOne.mockResolvedValue({
      _id: "user-123",
      firebaseUid: "firebase-123",
    });

    const execution = {
      _id: "execution-123",
      status: "COMPLETED",
      output: "Done",
    };

    executionServiceMock.getExecutionById.mockResolvedValue(execution);

    const req = {
      firebaseUser: {
        uid: "firebase-123",
      },
      params: {
        id: "execution-123",
      },
    };

    const res = createResponse();
    const next = vi.fn();

    await getExecution(req, res, next);

    expect(executionServiceMock.getExecutionById).toHaveBeenCalledWith(
      "execution-123",
      "user-123",
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Execution fetched successfully.",
      data: execution,
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("returns 404 when the execution does not belong to the user", async () => {
    userMock.findOne.mockResolvedValue({
      _id: "user-123",
      firebaseUid: "firebase-123",
    });

    executionServiceMock.getExecutionById.mockResolvedValue(null);

    const req = {
      firebaseUser: {
        uid: "firebase-123",
      },
      params: {
        id: "other-user-execution",
      },
    };

    const res = createResponse();
    const next = vi.fn();

    await getExecution(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Execution not found.",
      data: null,
    });

    expect(next).not.toHaveBeenCalled();
  });
});
