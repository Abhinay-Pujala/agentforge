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
 *   status?: "COMPLETED" | "INPUT_REQUIRED" | "FAILED",
 *   result?: object,
 *   data?: object,
 *   message?: string,
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

function normalizeStatus(value) {
  if (typeof value !== "string") {
    return null;
  }

  const status = value.trim().toUpperCase();
  return ["COMPLETED", "INPUT_REQUIRED", "FAILED"].includes(status)
    ? status
    : null;
}

function getExplicitStatus(result) {
  return normalizeStatus(
    result?.status ??
      result?.result?.status ??
      result?.data?.status,
  );
}

function getInputRequiredMessage(result) {
  if (typeof result?.message === "string" && result.message.trim()) {
    return result.message.trim();
  }

  if (
    typeof result?.result?.message === "string" &&
    result.result.message.trim()
  ) {
    return result.result.message.trim();
  }

  if (typeof result?.raw === "string") {
    const raw = result.raw.trim();
    const match = raw.match(/^INPUT_REQUIRED\\s*:\\s*(.+)$/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "Additional workflow input is required before this workflow can continue.";
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
  const explicitStatus = getExplicitStatus(result);
  const rawInputRequired =
    typeof result?.raw === "string" &&
    /^INPUT_REQUIRED\\s*:/i.test(result.raw.trim());

  if (explicitStatus === "FAILED" || result?.success === false) {
    return {
      success: false,
      status: "FAILED",
      error: result.error || result.result?.error || {
        code: "N8N_WORKFLOW_FAILED",
        message: "The n8n workflow reported a failure.",
      },
      result,
    };
  }

  if (
    explicitStatus === "INPUT_REQUIRED" ||
    missingFields.length > 0 ||
    rawInputRequired
  ) {
    return {
      success: true,
      status: "INPUT_REQUIRED",
      missingFields,
      message: getInputRequiredMessage(result),
      data: result?.data ?? result?.result?.data,
      result,
    };
  }

  if (explicitStatus === "COMPLETED") {
    return {
      success: true,
      status: "COMPLETED",
      message: result?.message ?? result?.result?.message,
      data: result?.data ?? result?.result?.data,
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
