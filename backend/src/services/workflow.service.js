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

export function getWorkflowConfigurationStatus(workflow) {
  if (workflow?.status === "disabled") {
    return {
      code: "DISABLED",
      label: "Disabled",
      description: "This workflow is disabled and cannot be triggered.",
    };
  }

  const provider = workflow?.webhook?.provider;
  const webhookUrl = workflow?.webhook?.url;

  if (provider !== "n8n" || typeof webhookUrl !== "string" || !webhookUrl.trim()) {
    return {
      code: "CONFIGURATION_REQUIRED",
      label: "Configuration Required",
      description: "The workflow is missing a valid n8n connection configuration.",
    };
  }

  try {
    const url = new URL(webhookUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch {
    return {
      code: "CONFIGURATION_REQUIRED",
      label: "Configuration Required",
      description: "The workflow does not have a valid n8n webhook URL.",
    };
  }

  return {
    code: "READY",
    label: "Ready",
    description: "The workflow has the configuration required to be tested.",
  };
}

export function withWorkflowConfigurationStatus(workflow) {
  const plainWorkflow =
    typeof workflow?.toObject === "function" ? workflow.toObject() : { ...workflow };

  return {
    ...plainWorkflow,
    configurationStatus: getWorkflowConfigurationStatus(plainWorkflow),
  };
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
