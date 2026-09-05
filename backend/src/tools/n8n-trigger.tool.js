import { triggerN8nWorkflow } from "../services/n8n.service.js";

export const n8nTriggerTool = {
  name: "n8n.trigger",
  description: "Trigger a configured n8n workflow with structured data.",
  permission: "n8n.trigger",

  schema: {
    type: "object",
    properties: {
      workflow: {
        type: "string",
        description: "The configured n8n workflow name to trigger.",
      },
      data: {
        type: "object",
        description: "Structured data to send to the workflow.",
        additionalProperties: true,
      },
    },
    required: ["workflow", "data"],
    additionalProperties: false,
  },

  async execute(toolArguments, context = {}) {
    const configuredWorkflow = context.worker?.configuration?.n8n?.workflow;

    if (!configuredWorkflow) {
      const error = new Error("No n8n workflow is configured for this worker.");

      error.code = "N8N_WORKFLOW_NOT_CONFIGURED";

      throw error;
    }

    if (toolArguments.workflow !== configuredWorkflow) {
      const error = new Error(
        `Workflow "${toolArguments.workflow}" is not allowed for this worker.`,
      );

      error.code = "N8N_WORKFLOW_NOT_ALLOWED";

      throw error;
    }

    return triggerN8nWorkflow({
      workflow: configuredWorkflow,
      data: toolArguments.data,
      workerId: context.workerId,
      executionId: context.executionId,
    });
  },
};
