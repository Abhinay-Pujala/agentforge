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

const FREEFORM_FIELD_HINTS = [
  "message", "body", "text", "content", "description", "details",
  "reason", "notes", "instructions", "prompt", "query", "request", "comment",
];

const GENERIC_WORKFLOW_TOKENS = new Set([
  "send", "email", "mail", "message", "create", "add", "update", "edit",
  "delete", "remove", "find", "lookup", "search", "fetch", "get", "retrieve",
  "save", "store", "insert", "append", "notify", "schedule", "trigger", "run",
  "execute", "generate", "post", "publish", "upload", "download", "sync",
  "export", "import", "move", "copy", "archive", "assign", "please", "want",
  "need", "would", "could", "should", "the", "this", "that", "to", "an", "a",
  "for", "with", "from", "about", "saying", "say", "says", "tell", "write",
]);

function hasExplicitFreeformInput(userInput, fieldName) {
  if (typeof userInput !== "string" || !userInput.trim()) {
    return false;
  }

  const field = String(fieldName || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();

  const isMessageField = ["message", "text", "body", "content"].includes(field);
  if (!isMessageField) {
    return true;
  }

  // Explicit phrases make it clear that the user supplied email content.
  if (
    /\b(?:saying|say|message|body|content|tell(?: them)?|write|that says)\b/i.test(
      userInput,
    )
  ) {
    return true;
  }

  // Also accept natural language where content follows the recipient directly,
  // e.g. "Send an email to user@example.com for tomorrow's meeting."
  const emailMatch = userInput.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  );

  if (emailMatch?.index !== undefined) {
    const trailingText = userInput
      .slice(emailMatch.index + emailMatch[0].length)
      .replace(/^[\s,:;-]+/, "")
      .replace(/[.!?]+$/, "")
      .trim();

    return trailingText.length > 0;
  }

  return false;
}

function deriveEmailSubject(data, requiredFields) {
  if (!Array.isArray(requiredFields) || !requiredFields.includes("subject")) {
    return data;
  }

  if (typeof data.subject === "string" && data.subject.trim()) {
    return data;
  }

  const bodyField = ["message", "text", "body", "content"].find(
    (field) => typeof data[field] === "string" && data[field].trim(),
  );

  if (!bodyField) {
    return data;
  }

  const body = data[bodyField].trim().replace(/\s+/g, " ");
  const firstSentence = body.split(/[.!?]/)[0].trim();
  const source = firstSentence || body;
  const words = source.split(" ").filter(Boolean).slice(0, 8);

  if (words.length === 0) {
    return data;
  }

  const subject = words.join(" ").replace(/[,;:]+$/, "");
  return {
    ...data,
    subject: subject.length > 80 ? subject.slice(0, 77).trimEnd() + "..." : subject,
  };
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

    let sanitizedData = removePlaceholderValues(originalData);

    // Email subjects are derived from the user-provided message when the
    // model omits one. This prevents the HITL flow from asking the user for a
    // value the worker is explicitly responsible for generating.
    const requiredFields = Array.isArray(workflow.inputSchema?.required)
      ? workflow.inputSchema.required
      : [];
    sanitizedData = deriveEmailSubject(sanitizedData, requiredFields);

    // Never execute a side-effect workflow when the model supplied a
    // placeholder for a field. Even if that field is optional in the
    // registered schema, a placeholder is not real user input.
    const placeholderFields = Object.keys(originalData).filter(
      (key) =>
        typeof originalData[key] === "string" &&
        isPlaceholderValue(originalData[key], key) &&
        sanitizedData[key] === originalData[key],
    );

    const validation = validateToolArguments(
      sanitizedData,
      workflow.inputSchema,
    );

    const requiredFields = Array.isArray(workflow.inputSchema?.required)
      ? workflow.inputSchema.required
      : [];

    // Do not let the model invent a required free-form value such as an
    // email body when the user never supplied one. The model may still
    // polish/rewrite a body that the user actually provided.
    const explicitWorkflowInput =
      context.explicitWorkflowInput &&
      typeof context.explicitWorkflowInput === "object"
        ? context.explicitWorkflowInput
        : {};

    const userInputForGrounding =
      typeof context.explicitUserInput === "string" && context.explicitUserInput.trim()
        ? context.explicitUserInput
        : context.originalUserInput;

    const hasGroundingContext =
      typeof userInputForGrounding === "string" &&
      userInputForGrounding.trim().length > 0;

    const missingUserProvidedFields = hasGroundingContext
      ? requiredFields.filter((field) => {
          if (!["message", "text", "body", "content"].includes(
            String(field).toLowerCase(),
          )) {
            return false;
          }

          const explicitlyResumed =
            explicitWorkflowInput[field] !== undefined &&
            explicitWorkflowInput[field] !== null &&
            String(explicitWorkflowInput[field]).trim();

          return (
            !explicitlyResumed &&
            !hasExplicitFreeformInput(userInputForGrounding, field)
          );
        })
      : [];

    if (missingUserProvidedFields.length > 0) {
      return {
        status: "INPUT_REQUIRED",
        workflowId: workflow._id.toString(),
        workflowName: workflow.name,
        missingFields: missingUserProvidedFields,
        validationErrors: missingUserProvidedFields.map(
          (field) => `arguments.${field} must be supplied by the user`,
        ),
        message:
          "Additional workflow input is required before this workflow can run.",
      };
    }

    if (placeholderFields.length > 0) {
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
          ? [
              ...placeholderFields.map(
                (field) => `arguments.${field} contains a placeholder value`,
              ),
            ]
          : [
              ...validation.errors,
            ],
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
