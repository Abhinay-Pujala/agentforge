import { describe, it, expect, vi, beforeEach } from "vitest";

const userMock = {
  findOne: vi.fn(),
};

const workerMock = {
  create: vi.fn(),
  findOneAndUpdate: vi.fn(),
};

vi.mock("../src/models/user.model.js", () => ({
  default: userMock,
}));

vi.mock("../src/models/worker.model.js", () => ({
  default: workerMock,
}));

const { createWorker, updateWorker } =
  await import("../src/controllers/worker.controller.js");

describe("Worker controller tool configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    userMock.findOne.mockResolvedValue({
      _id: "user-123",
      firebaseUid: "firebase-123",
    });
  });

  function createResponse() {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  }

  it("persists tool configuration when creating a worker", async () => {
    const worker = {
      _id: "worker-123",
      name: "Calculator Worker",
      enabledTools: ["calculator"],
    };

    workerMock.create.mockResolvedValue(worker);

    const req = {
      body: {
        name: "Calculator Worker",
        description: "Performs calculations",
        instructions: "Use the calculator when needed",
        model: "test-model",
        configuration: {},
        enabledTools: ["calculator"],
        permissions: ["calculator.execute"],
      },
      firebaseUser: {
        uid: "firebase-123",
      },
    };

    const res = createResponse();
    const next = vi.fn();

    await createWorker(req, res, next);

    expect(workerMock.create).toHaveBeenCalledWith({
      owner: "user-123",
      name: "Calculator Worker",
      description: "Performs calculations",
      instructions: "Use the calculator when needed",
      model: "test-model",
      configuration: {},
      enabledTools: ["calculator"],
      permissions: ["calculator.execute"],
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it("persists tool configuration when updating a worker", async () => {
    const worker = {
      _id: "worker-123",
      name: "Calculator Worker",
      enabledTools: ["calculator"],
    };

    workerMock.findOneAndUpdate.mockResolvedValue(worker);

    const req = {
      params: {
        id: "worker-123",
      },
      body: {
        enabledTools: ["calculator"],
        permissions: ["calculator.execute"],
      },
      firebaseUser: {
        uid: "firebase-123",
      },
    };

    const res = createResponse();
    const next = vi.fn();

    await updateWorker(req, res, next);

    expect(workerMock.findOneAndUpdate).toHaveBeenCalledWith(
      {
        owner: "user-123",
        _id: "worker-123",
      },
      {
        name: undefined,
        description: undefined,
        instructions: undefined,
        model: undefined,
        configuration: undefined,
        enabledTools: ["calculator"],
        permissions: ["calculator.execute"],
        status: undefined,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
