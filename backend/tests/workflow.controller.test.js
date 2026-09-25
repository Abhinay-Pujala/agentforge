import { describe, it, expect, vi, beforeEach } from "vitest";

const userMock = {
  findOne: vi.fn(),
};

const workflowMock = {
  create: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn(),
};

vi.mock("../src/models/user.model.js", () => ({
  default: userMock,
}));

vi.mock("../src/models/workflow.model.js", () => ({
  default: workflowMock,
}));

const {
  createWorkflowController,
  getWorkflowList,
  getWorkflow,
  updateWorkflowController,
  deleteWorkflowController,
} = await import("../src/controllers/workflow.controller.js");

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("Workflow registry controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    userMock.findOne.mockResolvedValue({
      _id: "user-123",
      firebaseUid: "firebase-123",
    });
  });

  it("creates a workflow for the authenticated user", async () => {
    const workflow = { _id: "workflow-123", name: "Gmail Automation" };
    workflowMock.create.mockResolvedValue(workflow);

    const req = {
      body: {
        name: "Gmail Automation",
        description: "Send email through n8n",
        category: "email",
        webhook: {
          provider: "n8n",
          url: "https://example.com/webhook/gmail",
        },
        permissions: ["gmail.send"],
        inputSchema: {
          type: "object",
          properties: { to: { type: "string" } },
        },
      },
      firebaseUser: { uid: "firebase-123" },
    };
    const res = createResponse();
    const next = vi.fn();

    await createWorkflowController(req, res, next);

    expect(workflowMock.create).toHaveBeenCalledWith({
      owner: "user-123",
      ...req.body,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it("lists only workflows owned by the authenticated user", async () => {
    const workflows = [{ _id: "workflow-123", name: "Gmail Automation" }];
    const sort = vi.fn().mockResolvedValue(workflows);
    workflowMock.find.mockReturnValue({ sort });

    const req = {
      query: { status: "enabled", category: "email" },
      firebaseUser: { uid: "firebase-123" },
    };
    const res = createResponse();
    const next = vi.fn();

    await getWorkflowList(req, res, next);

    expect(workflowMock.find).toHaveBeenCalledWith({
      owner: "user-123",
      status: "enabled",
      category: "email",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: workflows }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("does not expose workflows owned by another user", async () => {
    workflowMock.findOne.mockResolvedValue(null);

    const req = {
      params: { id: "workflow-123" },
      firebaseUser: { uid: "firebase-123" },
    };
    const res = createResponse();
    const next = vi.fn();

    await getWorkflow(req, res, next);

    expect(workflowMock.findOne).toHaveBeenCalledWith({
      _id: "workflow-123",
      owner: "user-123",
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("updates only a workflow owned by the authenticated user", async () => {
    const workflow = { _id: "workflow-123", status: "disabled" };
    workflowMock.findOneAndUpdate.mockResolvedValue(workflow);

    const req = {
      params: { id: "workflow-123" },
      body: { status: "disabled" },
      firebaseUser: { uid: "firebase-123" },
    };
    const res = createResponse();
    const next = vi.fn();

    await updateWorkflowController(req, res, next);

    expect(workflowMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "workflow-123", owner: "user-123" },
      { status: "disabled" },
      { new: true, runValidators: true },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("deletes only a workflow owned by the authenticated user", async () => {
    workflowMock.findOneAndDelete.mockResolvedValue({
      _id: "workflow-123",
    });

    const req = {
      params: { id: "workflow-123" },
      firebaseUser: { uid: "firebase-123" },
    };
    const res = createResponse();
    const next = vi.fn();

    await deleteWorkflowController(req, res, next);

    expect(workflowMock.findOneAndDelete).toHaveBeenCalledWith({
      _id: "workflow-123",
      owner: "user-123",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
