const EXECUTION_POLICY = {
  provider: "openrouter",

  supportedModels: ["gemini-3.6-flash-lite"],

  timeoutMs: 30_000,

  maxTokens: 2_000,

  maxCost: 0.05,
};

export function validateExecutionPolicy(worker) {
  if (!worker) {
    throw new Error("Worker is required");
  }

  if (!worker.model) {
    const error = new Error("Worker model is required");
    error.code = "MODEL_REQUIRED";
    error.statusCode = 400;
    throw error;
  }

  if (!EXECUTION_POLICY.supportedModels.includes(worker.model)) {
    const error = new Error(`Unsupported model: ${worker.model}`);
    error.code = "UNSUPPORTED_MODEL";
    error.statusCode = 400;
    throw error;
  }

  return EXECUTION_POLICY;
}

export function getExecutionPolicy() {
  return EXECUTION_POLICY;
}

export function validateExecutionCost(cost) {
  const policy = getExecutionPolicy();

  if (cost === null || cost === undefined) {
    return;
  }

  if (typeof cost !== "number" || Number.isNaN(cost) || cost < 0) {
    const error = new Error("Invalid execution cost metadata");
    error.code = "INVALID_COST";
    error.statusCode = 502;
    throw error;
  }

  if (cost > policy.maxCost) {
    const error = new Error(
      `Execution cost exceeded the maximum allowed cost of ${policy.maxCost}`,
    );
    error.code = "COST_LIMIT_EXCEEDED";
    error.statusCode = 402;
    throw error;
  }
}
