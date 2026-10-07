import User from "../models/user.model.js";
import Worker from "../models/worker.model.js";
import { getWorkerExecutionContext } from "../services/worker-execution.service.js";
import {
  createExecution,
  updateExecutionStatus,
} from "../services/execution.service.js";
import WorkerExecutionEngine from "../runtime/worker-flow/worker-execution-engine.js";
import {
  validateExecutionCost,
  validateExecutionPolicy,
} from "../runtime/execution-policy.js";

function addExecutionIdToMetadata(result, executionId) {
  return {
    ...(result || {}),
    metadata: {
      ...(result?.metadata || {}),
      executionId: executionId.toString(),
    },
  };
}

function executionError(err) {
  return {
    message: err?.userMessage || err?.message || "Worker execution failed.",
    code: err?.code || err?.statusCode || null,
    category: err?.category || null,
    retryable: err?.retryable ?? false,
  };
}

export async function createWorker(req, res, next) {
  try {
    const { name, description, instructions, model, configuration, enabledTools, permissions, workflowIds, status } = req.body;
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!user) {
      return res.status(404).json({ success: false, message: "user not found. Please sync your account first.", data: null });
    }
    const worker = await Worker.create({
      owner: user._id, name, description, instructions, model, configuration,
      enabledTools, permissions, workflowIds, status,
    });
    return res.status(201).json({ success: true, message: "Worker created successfully.", data: worker });
  } catch (err) { next(err); }
}

export async function getWorkers(req, res, next) {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!user) return res.status(404).json({ success: false, message: "user not found. Please sync your account first.", data: null });
    const workers = await Worker.find({ owner: user._id });
    return res.status(200).json({ success: true, message: "Workers fetched successfully", data: workers });
  } catch (err) { next(err); }
}

export async function getWorkerById(req, res, next) {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!user) return res.status(404).json({ success: false, message: "User not found. Please sync your account first.", data: null });
    const worker = await Worker.findOne({ owner: user._id, _id: req.params.id });
    if (!worker) return res.status(404).json({ success: false, message: "Worker not found.", data: null });
    return res.status(200).json({ success: true, message: "Worker fetched successfully", data: worker });
  } catch (err) { next(err); }
}

export async function updateWorker(req, res, next) {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!user) return res.status(404).json({ success: false, message: "User not found. Please sync your account first.", data: null });
    const { name, description, instructions, model, configuration, enabledTools, permissions, workflowIds, status } = req.body;
    const worker = await Worker.findOneAndUpdate(
      { owner: user._id, _id: req.params.id },
      { name, description, instructions, model, configuration, enabledTools, permissions, workflowIds, status },
      { new: true, runValidators: true },
    );
    if (!worker) return res.status(404).json({ success: false, message: "Worker not found.", data: null });
    return res.status(200).json({ success: true, message: "Worker updated successfully.", data: worker });
  } catch (err) { next(err); }
}

export async function deleteWorker(req, res, next) {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!user) return res.status(404).json({ success: false, message: "User not found. Please sync your account first.", data: null });
    const worker = await Worker.findOneAndDelete({ owner: user._id, _id: req.params.id });
    if (!worker) return res.status(404).json({ success: false, message: "Worker not found.", data: null });
    return res.status(200).json({ success: true, message: "Worker deleted successfully.", data: worker });
  } catch (err) { next(err); }
}

export async function runWorker(req, res, next) {
  let execution = null;
  let startedAt = null;
  let result = null;

  try {
    const { id } = req.params;
    const { input } = req.body;
    const { user, worker, context } = await getWorkerExecutionContext(req.firebaseUser.uid, id);
    const executionPolicy = validateExecutionPolicy(worker);

    execution = await createExecution(user._id, worker._id, input, worker.model);
    startedAt = new Date();

    await updateExecutionStatus(execution._id, {
      status: "RUNNING",
      startedAt,
      completedAt: null,
      error: { message: null, code: null, category: null, retryable: false },
    });

    const engine = new WorkerExecutionEngine();
    result = await engine.execute({
      worker,
      input,
      context,
      executionPolicy,
      executionId: execution._id,
    });

    result = addExecutionIdToMetadata(result, execution._id);
    validateExecutionCost(result.metadata?.usage?.cost);

    const completedAt = new Date();
    const workflow = result.workflow;

    await updateExecutionStatus(execution._id, {
      status: "COMPLETED",
      output: result.output || null,
      workflowId: workflow?.workflowId || result.metadata?.workflowId || null,
      workflowData: workflow?.data || {},
      missingFields: [],
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      usage: {
        promptTokens: result.metadata?.usage?.prompt_tokens ?? null,
        completionTokens: result.metadata?.usage?.completion_tokens ?? null,
        totalTokens: result.metadata?.usage?.total_tokens ?? null,
      },
      cost: result.metadata?.usage?.cost ?? null,
      toolCalls: [],
    });

    return res.status(200).json({
      success: true,
      message: "Worker executed successfully.",
      data: result,
    });
  } catch (err) {
    if (execution) {
      const completedAt = new Date();
      const error = executionError(err);
      await updateExecutionStatus(execution._id, {
        status: err?.statusCode === 504 || err?.code === "N8N_TIMEOUT" ? "TIMEOUT" : "FAILED",
        output: result?.output || null,
        error,
        completedAt,
        durationMs: startedAt ? completedAt.getTime() - startedAt.getTime() : null,
        toolCalls: [],
      });
    }
    next(err);
  }
}
