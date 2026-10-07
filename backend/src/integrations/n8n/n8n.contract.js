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
    return value.map((field) => String(field).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, required]) => required === true)
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
    result?.status ?? result?.result?.status ?? result?.data?.status,
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

export function buildN8nSuccessResponse(responseData = {}) {
  const rawText =
    typeof responseData?.raw === "string" ? responseData.raw.trim() : "";

  /*
   * ---------------------------------------------------------
   * 1. Plain-text INPUT_REQUIRED
   * ---------------------------------------------------------
   */
  const inputRequiredMatch = rawText.match(/^INPUT_REQUIRED\s*:\s*(.+)$/is);

  if (inputRequiredMatch) {
    return {
      success: true,
      status: "INPUT_REQUIRED",
      message: inputRequiredMatch[1].trim(),
    };
  }

  /*
   * ---------------------------------------------------------
   * 2. Explicit structured INPUT_REQUIRED
   * ---------------------------------------------------------
   */
  if (responseData?.status === "INPUT_REQUIRED") {
    return {
      ...responseData,
      success: responseData.success !== false,
      status: "INPUT_REQUIRED",
    };
  }

  /*
   * ---------------------------------------------------------
   * 3. Array-shaped missingFields
   * ---------------------------------------------------------
   */
  if (
    Array.isArray(responseData?.missingFields) &&
    responseData.missingFields.length > 0
  ) {
    return {
      ...responseData,
      success: responseData.success !== false,
      status: "INPUT_REQUIRED",
    };
  }

  /*
   * ---------------------------------------------------------
   * 4. Object-shaped missingFields
   *
   * Example:
   *
   * {
   *   missingFields: {
   *     to: "...",
   *     subject: "..."
   *   }
   * }
   * ---------------------------------------------------------
   */
  if (
    responseData?.missingFields &&
    typeof responseData.missingFields === "object" &&
    !Array.isArray(responseData.missingFields)
  ) {
    const missingFields = normalizeMissingFields(responseData.missingFields);

    if (missingFields.length > 0) {
      return {
        ...responseData,
        success: responseData.success !== false,
        status: "INPUT_REQUIRED",
        missingFields,
      };
    }
  }

  /*
   * ---------------------------------------------------------
   * 5. Check nested result for workflow status
   *
   * Some n8n responses may wrap the actual workflow response
   * inside `result`.
   * ---------------------------------------------------------
   */
  const nestedResult =
    responseData?.result && typeof responseData.result === "object"
      ? responseData.result
      : null;

  if (nestedResult) {
    if (nestedResult.status === "INPUT_REQUIRED") {
      return {
        ...responseData,
        success: responseData.success !== false,
        status: "INPUT_REQUIRED",
        missingFields: nestedResult.missingFields,
        message: nestedResult.message,
        data: nestedResult.data,
      };
    }

    if (
      Array.isArray(nestedResult.missingFields) &&
      nestedResult.missingFields.length > 0
    ) {
      return {
        ...responseData,
        success: responseData.success !== false,
        status: "INPUT_REQUIRED",
        missingFields: nestedResult.missingFields,
        message: nestedResult.message,
        data: nestedResult.data,
      };
    }

    if (
      nestedResult.missingFields &&
      typeof nestedResult.missingFields === "object" &&
      !Array.isArray(nestedResult.missingFields)
    ) {
      const missingFields = normalizeMissingFields(nestedResult.missingFields);

      if (missingFields.length > 0) {
        return {
          ...responseData,
          success: responseData.success !== false,
          status: "INPUT_REQUIRED",
          missingFields,
          message: nestedResult.message,
          data: nestedResult.data,
        };
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * 6. Explicit FAILED response
   * ---------------------------------------------------------
   */
  if (responseData?.status === "FAILED" || responseData?.success === false) {
    return {
      ...responseData,
      success: false,
      status: "FAILED",
    };
  }

  /*
   * ---------------------------------------------------------
   * 7. Explicit COMPLETED response
   * ---------------------------------------------------------
   */
  if (responseData?.status === "COMPLETED") {
    return {
      ...responseData,
      success: true,
      status: "COMPLETED",
    };
  }

  /*
   * ---------------------------------------------------------
   * 8. Legacy successful n8n response
   *
   * IMPORTANT:
   * Preserve the complete response exactly.
   * Do not flatten or remove nested `result`.
   * ---------------------------------------------------------
   */
  return {
    success: true,
    status: "COMPLETED",
    result: responseData,
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
