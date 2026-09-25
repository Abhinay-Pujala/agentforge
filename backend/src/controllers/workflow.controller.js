import User from "../models/user.model.js";
import { classifyN8nError, triggerN8nWorkflow } from "../services/n8n.service.js";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflowById,
  getWorkflows,
  updateWorkflow,
  withWorkflowConfigurationStatus,
  assertWorkflowAccess,
} from "../services/workflow.service.js";

async function getUser(req) {
  return User.findOne({
    firebaseUid: req.firebaseUser.uid,
  });
}

export async function createWorkflowController(req, res, next) {
  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
        data: null,
      });
    }

    const workflow = await createWorkflow(user._id, req.body);

    return res.status(201).json({
      success: true,
      message: "Workflow created successfully.",
      data: withWorkflowConfigurationStatus(workflow),
    });
  } catch (err) {
    if (err?.code?.startsWith("N8N_")) {
      err.userMessage = err.userMessage || classifyN8nError(err).message;
    }
    next(err);
  }
}

export async function getWorkflowList(req, res, next) {
  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
        data: null,
      });
    }

    const workflows = await getWorkflows(user._id, req.query);

    return res.status(200).json({
      success: true,
      message: "Workflows fetched successfully.",
      data: workflows.map(withWorkflowConfigurationStatus),
    });
  } catch (err) {
    next(err);
  }
}

export async function getWorkflow(req, res, next) {
  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
        data: null,
      });
    }

    const workflow = await getWorkflowById(req.params.id, user._id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found.",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workflow fetched successfully.",
      data: withWorkflowConfigurationStatus(workflow),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkflowController(req, res, next) {
  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
        data: null,
      });
    }

    const workflow = await updateWorkflow(
      req.params.id,
      user._id,
      req.body,
    );

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found.",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workflow updated successfully.",
      data: withWorkflowConfigurationStatus(workflow),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkflowController(req, res, next) {
  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
        data: null,
      });
    }

    const workflow = await deleteWorkflow(req.params.id, user._id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found.",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workflow deleted successfully.",
      data: workflow,
    });
  } catch (err) {
    next(err);
  }
}


export async function testWorkflowController(req, res, next) {
  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
        data: null,
      });
    }

    const workflow = await assertWorkflowAccess(req.params.id, user._id);
    const testData = req.body?.data ?? {};

    const result = await triggerN8nWorkflow({
      workflowId: workflow._id.toString(),
      workflow: workflow.name,
      webhookUrl: workflow.webhook.url,
      data: {
        ...testData,
        agentforge: {
          ...(testData.agentforge || {}),
          test: true,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Workflow test completed successfully.",
      data: {
        workflowId: workflow._id,
        workflowName: workflow.name,
        result,
      },
    });
  } catch (err) {
    next(err);
  }
}
