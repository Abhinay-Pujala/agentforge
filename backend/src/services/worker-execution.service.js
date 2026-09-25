import User from "../models/user.model.js";
import Worker from "../models/worker.model.js";
import Workflow from "../models/workflow.model.js";

export async function getWorkerExecutionContext(firebaseUid, workerId) {
  if (!firebaseUid) throw new Error("Authenticated user is required");
  if (!workerId) throw new Error("Worker ID is required");

  const user = await User.findOne({ firebaseUid });

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

  const workflowIds = (worker.workflowIds || []).map((id) => id.toString());

  const workflows = workflowIds.length
    ? await Workflow.find({
        _id: { $in: workflowIds },
        owner: user._id,
        status: "enabled",
      })
        .select("_id name description category status permissions inputSchema")
        .lean()
    : [];

  const workflowCatalog = workflows.map((workflow) => ({
    id: workflow._id.toString(),
    name: workflow.name,
    description: workflow.description,
    category: workflow.category,
    status: workflow.status,
    permissions: workflow.permissions || [],
    inputSchema: workflow.inputSchema || {},
  }));

  return {
    user,
    worker,
    context: {
      userId: user._id.toString(),
      workerId: worker._id.toString(),
      worker,
      workflowCatalog,
    },
  };
}
