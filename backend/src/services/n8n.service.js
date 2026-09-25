import {
  buildN8nPayload,
  buildN8nSuccessResponse,
} from "../integrations/n8n/n8n.contract.js";

const DEFAULT_TIMEOUT_MS = 10_000;

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
    if (error.code) throw error;
    throw Object.assign(
      new Error(error.message || "Failed to trigger n8n workflow"),
      { code: "N8N_REQUEST_FAILED" },
    );
  } finally {
    clearTimeout(timeout);
  }
}
