import User from "../models/user.model.js";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflowById,
  getWorkflows,
  updateWorkflow,
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
      data: workflow,
    });
  } catch (err) {
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
      data: workflows,
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
      data: workflow,
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
      data: workflow,
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
