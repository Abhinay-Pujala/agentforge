import { getN8nWorkflowUrl } from "../config/n8n.config.js";
import {
  buildN8nPayload,
  buildN8nSuccessResponse,
  buildN8nErrorResponse,
} from "../integrations/n8n/n8n.contract.js";

const DEFAULT_TIMEOUT_MS = 10_000;

export async function triggerN8nWorkflow({
  workflow,
  data,
  workerId,
  executionId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const url = getN8nWorkflowUrl(workflow);

  const payload = buildN8nPayload({
    workflow,
    data,
    workerId,
    executionId,
  });

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
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
        responseData = {
          raw: responseText,
        };
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
      throw error;
    }

    throw Object.assign(
      new Error(error.message || "Failed to trigger n8n workflow"),
      {
        code: "N8N_REQUEST_FAILED",
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}
