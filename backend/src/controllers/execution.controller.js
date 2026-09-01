import User from "../models/user.model.js";
import {
  getExecutionById,
  getExecutions,
} from "../services/execution.service.js";

export async function getExecutionHistory(req, res, next) {
  try {
    const user = await User.findOne({
      firebaseUid: req.firebaseUser.uid,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
        data: null,
      });
    }

    const { workerId, status, page, limit } = req.query;

    const result = await getExecutions({
      userId: user._id,
      workerId,
      status,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });

    return res.status(200).json({
      success: true,
      message: "Execution history fetched successfully.",
      data: result.executions,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function getExecution(req, res, next) {
  try {
    const user = await User.findOne({
      firebaseUid: req.firebaseUser.uid,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
        data: null,
      });
    }

    const execution = await getExecutionById(req.params.id, user._id);

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: "Execution not found.",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Execution fetched successfully.",
      data: execution,
    });
  } catch (err) {
    next(err);
  }
}
