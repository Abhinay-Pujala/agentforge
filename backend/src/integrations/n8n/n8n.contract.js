/**
 * AgentForge ↔ n8n Integration Contract
 *
 * AgentForge → n8n
 * {
 *   workflowId: string,
 *   workflow: string,
 *   data: object,
 *   agentforge: {
 *     workerId: string,
 *     executionId: string
 *   }
 * }
 *
 * n8n → AgentForge
 * {
 *   success: true,
 *   result: object,
 *   missingFields?: string[] | object
 * }
 */

function normalizeMissingFields(value) {
  if (Array.isArray(value)) {
    return value
      .map((field) => String(field).trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, required]) => Boolean(required))
      .map(([field]) => field);
  }

  return [];
}

export function buildN8nPayload({
  workflowId,
  workflow,
  data,
  workerId,
  executionId,
}) {
  return {
    workflowId,
    workflow,
    data,
    agentforge: {
      workerId,
      executionId,
    },
  };
}

export function buildN8nSuccessResponse(result = {}) {
  const missingFields = normalizeMissingFields(
    result?.missingFields ?? result?.result?.missingFields,
  );

  if (missingFields.length > 0) {
    return {
      success: true,
      status: "INPUT_REQUIRED",
      missingFields,
      result,
      message:
        "Additional workflow input is required before this workflow can continue.",
    };
  }

  if (result?.success === false) {
    return {
      success: false,
      status: "FAILED",
      error: result.error || {
        code: "N8N_WORKFLOW_FAILED",
        message: "The n8n workflow reported a failure.",
      },
      result,
    };
  }

  return {
    success: true,
    status: "COMPLETED",
    result,
  };
}

export function buildN8nErrorResponse(code, message) {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
