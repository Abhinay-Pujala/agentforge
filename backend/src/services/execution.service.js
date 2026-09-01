import Execution from "../models/execution.model.js";

export async function createExecution(userId, workerId, input, model) {
  const newExecution = await Execution.create({
    user: userId,
    worker: workerId,
    input,
    model,
  });

  return newExecution;
}

export async function updateExecutionStatus(executionId, updates) {
  const execution = await Execution.findOneAndUpdate(
    {
      _id: executionId,
    },
    updates,
    {
      new: true,
    },
  );

  return execution;
}

export async function getExecutions({
  userId,
  workerId,
  status,
  page = 1,
  limit = 20,
}) {
  const query = {
    user: userId,
  };

  if (workerId) {
    query.worker = workerId;
  }

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [executions, total] = await Promise.all([
    Execution.find(query)
      .populate("worker", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Execution.countDocuments(query),
  ]);

  return {
    executions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getExecutionById(executionId, userId) {
  const execution = await Execution.findOne({
    _id: executionId,
    user: userId,
  }).populate("worker", "name");

  return execution;
}
