import { assertWorkflowAccess } from "../services/workflow.service.js";
import { validateToolArguments } from "./tool-schema-validator.js";
import { triggerN8nWorkflow } from "../services/n8n.service.js";

function isPlaceholderValue(value, fieldName = "") {
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (!normalized) return true;

  const genericPlaceholders = new Set([
    "unknown", "not provided", "not specified", "not available",
    "n/a", "na", "none", "null", "undefined", "missing",
    "required", "placeholder",
  ]);

  if (genericPlaceholders.has(normalized)) return true;

  const field = String(fieldName || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();

  if (!field) return false;

  // Workflow schemas may call the email body `message`, `text`, `body`,
  // or `content`. Treat these as the same semantic field for placeholders.
  const aliases =
    ["message", "text", "body", "content"].includes(field)
      ? ["message", "text", "body", "content"]
      : [field];

  return aliases.some((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return (
      new RegExp(
        "^(?:no\\s+)?" + escaped +
          "\\s+(?:is\\s+)?(?:required|missing|provided|specified|available|given)$",
        "i",
      ).test(normalized) ||
      new RegExp(
        "^no\\s+" + escaped +
          "(?:\\s+was|\\s+is)?\\s+(?:provided|specified|available|given)$",
        "i",
      ).test(normalized) ||
      new RegExp(
        "^" + escaped +
          "\\s+(?:is\\s+)?(?:not\\s+provided|not\\s+specified|not\\s+available|missing)$",
        "i",
      ).test(normalized)
    );
  });
}

const BODY_FIELD_ALIASES = new Set(["message", "text", "body", "content"]);

const INPUT_STOP_WORDS = new Set([
  "send", "an", "a", "the", "email", "mail", "to", "at", "please",
  "saying", "say", "tell", "that", "about", "with", "and", "or",
  "for", "me", "my", "i", "ill", "will", "would", "can", "could",
  "want", "wants", "wanting", "from", "this", "is", "be", "it",
]);

function meaningfulTokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !INPUT_STOP_WORDS.has(token));
}

function bodyHasUserGrounding(body, originalInput) {
  const sourceTokens = new Set(meaningfulTokens(originalInput));
  const bodyTokens = meaningfulTokens(body);

  if (sourceTokens.size === 0 || bodyTokens.length === 0) {
    return false;
  }

  return bodyTokens.some((token) => sourceTokens.has(token));
}

function removePlaceholderValues(value) {
  if (Array.isArray(value)) {
    return value.map(removePlaceholderValues);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, fieldValue]) => !isPlaceholderValue(fieldValue, key))
      .map(([key, fieldValue]) => [key, removePlaceholderValues(fieldValue)]),
  );
}


export const n8nTriggerTool = {
  name: "n8n.trigger",
  description:
    "Trigger a registered n8n workflow. When a matching workflow is needed, call this tool even if some required workflow fields are missing. Omit unknown fields; the workflow input validator will return INPUT_REQUIRED so the execution can pause for user input.",
  permission: "n8n.trigger",

  schema: {
    type: "object",
    properties: {
      workflowId: {
        type: "string",
        description: "The registered AgentForge workflow ID.",
      },
      data: {
        type: "object",
        description:
          "Structured workflow data. Include only values known from the user or previous workflow results. Omit missing required fields instead of inventing placeholders.",
        additionalProperties: true,
      },
    },
    required: ["workflowId", "data"],
    additionalProperties: false,
  },

  async execute(toolArguments, context = {}) {
    const workflowId = toolArguments.workflowId;
    const worker = context.worker;

    if (!workflowId) {
      const error = new Error("Workflow ID is required.");
      error.code = "N8N_WORKFLOW_REQUIRED";
      throw error;
    }

    if (!worker?.workflowIds?.some((id) => id.toString() === workflowId)) {
      const error = new Error(
        `Workflow "${workflowId}" is not allowed for this worker.`,
      );
      error.code = "N8N_WORKFLOW_NOT_ALLOWED";
      throw error;
    }

    const workflow = await assertWorkflowAccess(
      workflowId,
      context.userId,
    );

    // Models sometimes emit placeholder strings such as "Message Required"
    // instead of omitting a field. Treat those exactly like missing values so
    // the workflow schema can return INPUT_REQUIRED rather than executing with
    // fake data.
    const originalData =
      toolArguments.data && typeof toolArguments.data === "object"
        ? toolArguments.data
        : {};

    const sanitizedData = removePlaceholderValues(originalData);

    // Never execute a side-effect workflow when the model supplied a
    // placeholder for a field. Even if that field is optional in the
    // registered schema, a placeholder is not real user input.
    const placeholderFields = Object.keys(originalData).filter(
      (key) =>
        typeof originalData[key] === "string" &&
        isPlaceholderValue(originalData[key], key),
    );

    // A model may otherwise invent a perfectly valid-looking email body when
    // the user only supplied a recipient. For side-effect workflows, require
    // message/text/body/content to be grounded in the original user request.
    const ungroundedBodyFields = Object.keys(originalData).filter((key) => {
      const normalizedKey = String(key).trim().toLowerCase();
      return (
        BODY_FIELD_ALIASES.has(normalizedKey) &&
        typeof originalData[key] === "string" &&
        !bodyHasUserGrounding(
          originalData[key],
          context.originalUserInput || "",
        )
      );
    });

    const invalidInputFields = [
      ...new Set([...placeholderFields, ...ungroundedBodyFields]),
    ];

    const validation = validateToolArguments(
      sanitizedData,
      workflow.inputSchema,
    );

    if (invalidInputFields.length > 0) {
      return {
        status: "INPUT_REQUIRED",
        workflowId: workflow._id.toString(),
        workflowName: workflow.name,
        missingFields: [
          ...new Set([
            ...placeholderFields,
            ...(validation.valid
              ? []
              : validation.errors
                  .filter((message) => message.endsWith(" is required"))
                  .map((message) =>
                    message
                      .replace(/^arguments\./, "")
                      .replace(/ is required$/, ""),
                  )),
          ]),
        ],
        validationErrors: validation.valid
          ? placeholderFields.map(
              (field) => `arguments.${field} contains a placeholder value`,
            )
          : validation.errors,
        message:
          "Additional workflow input is required before this workflow can run.",
      };
    }

    if (!validation.valid) {
      const missingFields = validation.errors
        .filter((message) => message.endsWith(" is required"))
        .map((message) =>
          message
            .replace(/^arguments\./, "")
            .replace(/ is required$/, ""),
        );

      if (missingFields.length > 0) {
        return {
          status: "INPUT_REQUIRED",
          workflowId: workflow._id.toString(),
          workflowName: workflow.name,
          missingFields,
          validationErrors: validation.errors,
          message:
            "Additional workflow input is required before this workflow can run.",
        };
      }

      const error = new Error(
        `Invalid input for workflow "${workflow.name}": ${validation.errors.join(", ")}`,
      );
      error.code = "N8N_WORKFLOW_INPUT_INVALID";
      throw error;
    }

    if (workflow.webhook?.provider !== "n8n") {
      const error = new Error("Unsupported workflow provider.");
      error.code = "WORKFLOW_PROVIDER_UNSUPPORTED";
      throw error;
    }

    return triggerN8nWorkflow({
      workflowId: workflow._id.toString(),
      workflow: workflow.name,
      webhookUrl: workflow.webhook.url,
      data: sanitizedData,
      workerId: context.workerId,
      executionId: context.executionId,
    });
  },
};
