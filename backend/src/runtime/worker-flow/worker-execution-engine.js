import { routeWorkflow } from "../workflow-router.js";
import { buildPrompt } from "../prompt-builder.js";
import OpenRouterProvider from "../providers/openrouter.provider.js";
import { normalizeModelResponse } from "../model-response.js";
import { triggerN8nWorkflow } from "../../services/n8n.service.js";

function buildWorkflowData(workflow, input, worker, executionId) {
  const schema = workflow?.inputSchema || {};
  const properties = schema.properties || {};
  const data = {};
  const original = String(input || "");

  // The original request is the stable AgentForge -> n8n contract. It is always present so an n8n Agent can reason over the complete user message, even when its registered schema is minimal.
  data.input = original;
  if (Object.prototype.hasOwnProperty.call(properties, "originalRequest")) data.originalRequest = original;
  if (Object.prototype.hasOwnProperty.call(properties, "request")) data.request = original;
  if (Object.prototype.hasOwnProperty.call(properties, "query")) data.query = original;
  if (Object.prototype.hasOwnProperty.call(properties, "prompt")) data.prompt = original;
  if (Object.prototype.hasOwnProperty.call(properties, "message")) data.message = original;
  if (Object.prototype.hasOwnProperty.call(properties, "text")) data.text = original;
  if (Object.prototype.hasOwnProperty.call(properties, "body")) data.body = original;
  if (Object.prototype.hasOwnProperty.call(properties, "content")) data.content = original;
  if (Object.prototype.hasOwnProperty.call(properties, "worker")) data.worker = worker.name;
  if (Object.prototype.hasOwnProperty.call(properties, "executionId")) data.executionId = executionId;
  if (Object.prototype.hasOwnProperty.call(properties, "timestamp")) data.timestamp = new Date().toISOString();

  const required = Array.isArray(schema.required) ? schema.required : [];
  const missing = required.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || (typeof value === "string" && !value.trim());
  });

  if (missing.length) {
    const error = new Error(
      `Workflow "${workflow.name}" requires fields AgentForge cannot derive from the original user request: ${missing.join(", ")}.`,
    );
    error.code = "WORKFLOW_INPUT_UNSUPPORTED";
    error.missingFields = missing;
    throw error;
  }

  return data;
}

function normalizeWorkflowResult(result, workflow) {
  if (!result || typeof result !== "object") {
    const error = new Error("n8n returned an invalid workflow response.");
    error.code = "N8N_INVALID_RESPONSE";
    throw error;
  }

  if (result.success === false) {
    const error = new Error(result?.error?.message || "The workflow failed.");
    error.code = result?.error?.code || "N8N_WORKFLOW_FAILED";
    error.statusCode = result?.status === "TIMEOUT" ? 504 : 502;
    error.category = result?.error?.category || "WORKFLOW_ERROR";
    error.retryable = result?.error?.retryable ?? false;
    throw error;
  }

  if (result.status === "FAILED" || result.status === "TIMEOUT") {
    const error = new Error(result?.error?.message || `Workflow ${result.status.toLowerCase()}.`);
    error.code = result?.error?.code || `N8N_${result.status}`;
    error.statusCode = result.status === "TIMEOUT" ? 504 : 502;
    throw error;
  }

  const payload = result.result ?? result.data ?? result;

  const messageCandidates = [
    result.message,
    result.output,
    payload?.message,
    payload?.output,
    payload?.result,
    payload?.result?.message,
    payload?.result?.output,
    payload?.result?.result,
    payload?.data?.message,
    payload?.data?.output,
    result.raw,
  ];

  const message = messageCandidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) || "Workflow completed successfully.";

  return {
    success: true,
    status: "COMPLETED",
    message,
    data: payload,
    workflowId: workflow.id,
    workflowName: workflow.name,
  };
}

export default class WorkerExecutionEngine {
  constructor({ modelProvider = new OpenRouterProvider() } = {}) {
    this.modelProvider = modelProvider;
  }

  async execute({ worker, input, context = {}, executionPolicy, executionId }) {
    if (!worker) throw new Error("Worker is required.");
    if (typeof input !== "string" || !input.trim()) {
      const error = new Error("Worker input is required.");
      error.code = "WORKER_INPUT_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const originalInput = input;
    const route = routeWorkflow(originalInput, context.workflowCatalog || []);

    if (route.needsWorkflow) {
      const workflow = route.workflow;
      const data = buildWorkflowData(workflow, originalInput, worker, executionId);

      const workflowResult = await triggerN8nWorkflow({
        workflowId: workflow.id,
        workflow: workflow.name,
        webhookUrl: workflow.webhookUrl || workflow.webhook?.url,
        data,
        workerId: worker._id.toString(),
        executionId: executionId?.toString(),
        timeoutMs: executionPolicy?.workflowTimeoutMs ?? executionPolicy?.toolTimeoutMs ?? 30000,
      });

      const normalized = normalizeWorkflowResult(workflowResult, workflow);

      return {
        success: true,
        output: normalized.message,
        metadata: {
          mode: "workflow",
          workflowId: workflow.id,
          workflowName: workflow.name,
          routerReason: route.reason,
          routerScore: route.score ?? null,
        },
        workflow: normalized,
        toolCalls: [],
      };
    }

    const modelResponse = await this.modelProvider.generate({
      model: worker.model,
      messages: buildPrompt(worker, originalInput),
      configuration: worker.configuration || {},
      executionPolicy,
      tools: [],
    });

    const normalized = normalizeModelResponse(modelResponse);

    if (normalized.toolCalls.length) {
      const error = new Error("Normal worker responses cannot execute tools.");
      error.code = "UNEXPECTED_TOOL_CALL";
      error.statusCode = 502;
      throw error;
    }

    return {
      success: true,
      output: normalized.output,
      metadata: {
        ...normalized.metadata,
        mode: "chat",
        routerReason: route.reason,
      },
      toolCalls: [],
    };
  }
}
