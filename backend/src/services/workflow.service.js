import Workflow from "../models/workflow.model.js";

export async function createWorkflow(ownerId, workflowData) {
  return Workflow.create({
    owner: ownerId,
    ...workflowData,
  });
}

export async function getWorkflows(ownerId, { status, category } = {}) {
  const query = { owner: ownerId };

  if (status) {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  return Workflow.find(query).sort({ createdAt: -1 });
}

export async function getWorkflowById(workflowId, ownerId) {
  return Workflow.findOne({
    _id: workflowId,
    owner: ownerId,
  });
}

export async function updateWorkflow(workflowId, ownerId, updates) {
  return Workflow.findOneAndUpdate(
    {
      _id: workflowId,
      owner: ownerId,
    },
    updates,
    {
      new: true,
      runValidators: true,
    },
  );
}

export async function deleteWorkflow(workflowId, ownerId) {
  return Workflow.findOneAndDelete({
    _id: workflowId,
    owner: ownerId,
  });
}

export async function assertWorkflowAccess(workflowId, ownerId) {
  const workflow = await getWorkflowById(workflowId, ownerId);

  if (!workflow) {
    const error = new Error("Workflow not found.");
    error.code = "WORKFLOW_NOT_FOUND";
    error.statusCode = 404;
    throw error;
  }

  if (workflow.status !== "enabled") {
    const error = new Error("Workflow is disabled.");
    error.code = "WORKFLOW_DISABLED";
    error.statusCode = 403;
    throw error;
  }

  return workflow;
}
