import User from "../models/user.model.js";
import Worker from "../models/worker.model.js";

export async function getWorkerExecutionContext(firebaseUid, workerId) {
  if (!firebaseUid) {
    throw new Error("Authenticated user is required");
  }

  if (!workerId) {
    throw new Error("Worker ID is required");
  }

  const user = await User.findOne({
    firebaseUid,
  });

  if (!user) {
    const error = new Error("User not found. Please sync your account first.");
    error.statusCode = 404;
    throw error;
  }

  const worker = await Worker.findOne({
    owner: user._id,
    _id: workerId,
  });

  if (!worker) {
    const error = new Error("Worker not found.");
    error.statusCode = 404;
    throw error;
  }

  return {
    user,
    worker,
    context: {
      userId: user._id.toString(),
      workerId: worker._id.toString(),
    },
  };
}
