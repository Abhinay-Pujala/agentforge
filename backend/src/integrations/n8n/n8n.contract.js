/**
 * AgentForge ↔ n8n Integration Contract
 *
 * This file documents the data contract used by the n8n integration.
 *
 * AgentForge → n8n
 * {
 *   workflow: string,
 *   data: object,
 *   agentforge: {
 *     workerId: string,
 *     executionId: string
 *   }
 * }
 *
 * n8n → AgentForge
 *
 * Success:
 * {
 *   success: true,
 *   result: object
 * }
 *
 * Failure:
 * {
 *   success: false,
 *   error: {
 *     code: string,
 *     message: string
 *   }
 * }
 */

/**
 * Build the payload sent from AgentForge to n8n.
 *
 * @param {Object} params
 * @param {string} params.workflow
 * @param {Object} params.data
 * @param {string} params.workerId
 * @param {string} params.executionId
 * @returns {Object}
 */
export function buildN8nPayload({ workflow, data, workerId, executionId }) {
  return {
    workflow,
    data,
    agentforge: {
      workerId,
      executionId,
    },
  };
}

/**
 * Normalize a successful n8n response.
 *
 * @param {Object} result
 * @returns {Object}
 */
export function buildN8nSuccessResponse(result = {}) {
  return {
    success: true,
    result,
  };
}

/**
 * Normalize an n8n failure response.
 *
 * @param {string} code
 * @param {string} message
 * @returns {Object}
 */
export function buildN8nErrorResponse(code, message) {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
