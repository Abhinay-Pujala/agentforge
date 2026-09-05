import { describe, it, expect, vi, beforeEach } from "vitest";

const userMock = {
  findOne: vi.fn(),
};

const workerMock = {
  findOne: vi.fn(),
};

vi.mock("../src/models/user.model.js", () => ({
  default: userMock,
}));

vi.mock("../src/models/worker.model.js", () => ({
  default: workerMock,
}));

const { getWorkerExecutionContext } =
  await import("../src/services/worker-execution.service.js");

describe("Worker Execution Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when firebaseUid is missing", async () => {
    await expect(getWorkerExecutionContext(null, "worker-123")).rejects.toThrow(
      "Authenticated user is required",
    );

    expect(userMock.findOne).not.toHaveBeenCalled();
  });

  it("throws when workerId is missing", async () => {
    await expect(
      getWorkerExecutionContext("firebase-123", null),
    ).rejects.toThrow("Worker ID is required");

    expect(userMock.findOne).not.toHaveBeenCalled();
  });

  it("throws 404 when the user does not exist", async () => {
    userMock.findOne.mockResolvedValue(null);

    await expect(
      getWorkerExecutionContext("unknown-firebase-user", "worker-123"),
    ).rejects.toMatchObject({
      message: "User not found. Please sync your account first.",
      statusCode: 404,
    });

    expect(userMock.findOne).toHaveBeenCalledWith({
      firebaseUid: "unknown-firebase-user",
    });

    expect(workerMock.findOne).not.toHaveBeenCalled();
  });

  it("throws 404 when the worker does not belong to the user", async () => {
    const user = {
      _id: "user-123",
      firebaseUid: "firebase-123",
    };

    userMock.findOne.mockResolvedValue(user);
    workerMock.findOne.mockResolvedValue(null);

    await expect(
      getWorkerExecutionContext("firebase-123", "worker-123"),
    ).rejects.toMatchObject({
      message: "Worker not found.",
      statusCode: 404,
    });

    expect(workerMock.findOne).toHaveBeenCalledWith({
      owner: "user-123",
      _id: "worker-123",
    });
  });

  it("returns the user, worker, and execution context", async () => {
    const user = {
      _id: {
        toString: () => "user-123",
      },
      firebaseUid: "firebase-123",
    };

    const worker = {
      _id: {
        toString: () => "worker-123",
      },
      owner: user._id,
      name: "Test Worker",
    };

    userMock.findOne.mockResolvedValue(user);
    workerMock.findOne.mockResolvedValue(worker);

    const result = await getWorkerExecutionContext(
      "firebase-123",
      "worker-123",
    );

    expect(userMock.findOne).toHaveBeenCalledWith({
      firebaseUid: "firebase-123",
    });

    expect(workerMock.findOne).toHaveBeenCalledWith({
      owner: user._id,
      _id: "worker-123",
    });

    expect(result).toEqual({
      user,
      worker,
      context: {
        userId: user._id.toString(),
        workerId: worker._id.toString(),
        worker,
      },
    });
  });
});
