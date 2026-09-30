import {
  buildN8nPayload,
  buildN8nSuccessResponse,
} from "../integrations/n8n/n8n.contract.js";

const DEFAULT_TIMEOUT_MS = 10_000;

export function classifyN8nError(error) {
  if (error?.code === "N8N_TIMEOUT" || error?.name === "AbortError") {
    return {
      code: "N8N_TIMEOUT",
      category: "TIMEOUT",
      message: "The n8n workflow did not respond within the allowed time.",
      retryable: true,
    };
  }

  if (error?.code === "N8N_WEBHOOK_NOT_CONFIGURED") {
    return {
      code: "N8N_WEBHOOK_NOT_CONFIGURED",
      category: "CONFIGURATION",
      message: "The workflow is missing a valid n8n webhook configuration.",
      retryable: false,
    };
  }

  if (error?.code === "N8N_REQUEST_FAILED") {
    if (typeof error?.status === "number" && error.status >= 400) {
      return {
        code: "N8N_REQUEST_FAILED",
        category: "WORKFLOW_ERROR",
        message:
          error.response?.error?.message ||
          "The n8n workflow rejected the request.",
        retryable: error.status >= 500,
      };
    }

    return {
      code: "N8N_CONNECTION_FAILED",
      category: "CONNECTION",
      message: "AgentForge could not connect to the n8n workflow.",
      retryable: true,
    };
  }

  return {
    code: error?.code || "N8N_UNKNOWN_ERROR",
    category: "UNKNOWN",
    message: "The n8n workflow could not be completed.",
    retryable: false,
  };
}


export async function triggerN8nWorkflow({
  workflowId,
  workflow,
  webhookUrl,
  data,
  workerId,
  executionId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!webhookUrl) {
    const error = new Error("Workflow webhook URL is not configured.");
    error.code = "N8N_WEBHOOK_NOT_CONFIGURED";
    throw error;
  }

  const payload = buildN8nPayload({
    workflowId,
    workflow,
    data,
    workerId,
    executionId,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AgentForge-Secret": process.env.N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responseData = {};

    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }
    }

    if (!response.ok) {
      const error = new Error(
        responseData?.error?.message ||
          `n8n request failed with status ${response.status}`,
      );
      error.code = responseData?.error?.code || "N8N_REQUEST_FAILED";
      error.status = response.status;
      error.response = responseData;
      throw error;
    }

    return buildN8nSuccessResponse(responseData);
  } catch (error) {
    if (error.name === "AbortError") {
      throw Object.assign(new Error("n8n workflow request timed out"), {
        code: "N8N_TIMEOUT",
      });
    }
    if (error.code) {
      const classified = classifyN8nError(error);
      error.userMessage = classified.message;
      error.category = classified.category;
      error.retryable = classified.retryable;
      throw error;
    }
    throw Object.assign(
      new Error(error.message || "Failed to trigger n8n workflow"),
      { code: "N8N_REQUEST_FAILED", category: "CONNECTION" },
    );
  } finally {
    clearTimeout(timeout);
  }
}
