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
 *   result: object
 * }
 */

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
  return {
    success: true,
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
