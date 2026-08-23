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
