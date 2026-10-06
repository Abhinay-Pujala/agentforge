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

function extractFreeformInput(userInput, fieldName) {
  if (typeof userInput !== "string" || !userInput.trim()) {
    return null;
  }

  const field = String(fieldName || "").toLowerCase();
  if (!["message", "text", "body", "content", "description"].includes(field)) {
    return null;
  }

  const normalized = userInput.trim();

  const cueMatch = normalized.match(
    /(?:saying|message|body|content|write|tell|say)\s*[:,-]?\s*(.+)$/i,
  );

  if (cueMatch?.[1]?.trim()) {
    return cueMatch[1].trim();
  }

  const emailMatch = normalized.match(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  );

  if (emailMatch) {
    const trailing = normalized
      .slice(emailMatch.index + emailMatch[0].length)
      .replace(/^[\s,;:.-]+/, "")
      .trim();

    if (trailing) {
      return trailing;
    }
  }

  return null;
}

function hasExplicitFreeformInput(userInput, fieldName) {
  return Boolean(extractFreeformInput(userInput, fieldName));
}

function isEmailWorkflow(workflow) {
  const haystack = [
    workflow?.name,
    workflow?.category,
    workflow?.description,
  ].filter(Boolean).join(" ").toLowerCase();

  return /\b(email|gmail|mail)\b/i.test(haystack);
}

function deriveEmailSubject(data, workflow) {
  if (!isEmailWorkflow(workflow)) return data;

  // Only derive a subject when the registered workflow schema actually
  // accepts a subject field. Never add fields that the workflow forbids.
  if (!workflow?.inputSchema?.properties?.subject) return data;

  const subject = data.subject;
  const message = data.message ?? data.text ?? data.body ?? data.content;

  if (!isPlaceholderValue(subject, "subject") && String(subject || "").trim()) {
    return data;
  }

  if (typeof message !== "string" || !message.trim()) {
    return data;
  }

  const firstSentence = message
    .trim()
    .split(/[.!?]\s+/)[0]
    .replace(/\s+/g, " ")
    .trim();

  if (!firstSentence) return data;

  const words = firstSentence.split(" ").slice(0, 8);
  const derivedSubject = words.join(" ").replace(/[.!?]+$/, "");

  return {
    ...data,
    subject: derivedSubject || "Email",
  };
}

function getRequiredMissingFields(errors, data, workflow) {
  const missing = errors
    .filter((message) => message.endsWith(" is required"))
    .map((message) =>
      message
        .replace(/^arguments\./, "")
        .replace(/ is required$/, ""),
    );

  // For email workflows the subject is derived from the message by the worker.
  // Never ask the user for a subject when the actual message is missing too.
  if (isEmailWorkflow(workflow)) {
    const hasMessage = ["message", "text", "body", "content"]
      .some((field) => {
        const value = data?.[field];
        return value !== undefined &&
          value !== null &&
          String(value).trim() &&
          !isPlaceholderValue(value, field);
      });

    if (!hasMessage) {
      return missing.filter((field) => field !== "subject");
    }
  }

  return missing;
}

function extractEmails(value) {
  if (typeof value !== "string") return [];
  return value.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) || [];
}

function isRecipientField(fieldName) {
  return [
    "to",
    "recipient",
    "email",
    "recipientemail",
    "destination",
  ].includes(
    String(fieldName || "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, "")
      .toLowerCase(),
  );
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

    // Never execute a side-effect workflow when the model supplied a
    // placeholder for a field. Even if that field is optional in the
    // registered schema, a placeholder is not real user input.
    const placeholderFields = Object.keys(originalData).filter(
      (key) =>
        typeof originalData[key] === "string" &&
        isPlaceholderValue(originalData[key], key),
    );

    sanitizedData = deriveEmailSubject(sanitizedData, workflow);

    const validation = validateToolArguments(
      sanitizedData,
      workflow.inputSchema,
    );

    // Required free-form fields must originate from the user (or from an
    // explicit resume answer). The worker may improve/rewrite that content,
    // but it must not invent an email body/message simply to satisfy schema
    // validation.
    const requiredFields = Array.isArray(workflow.inputSchema?.required)
      ? workflow.inputSchema.required
      : [];

    const explicitWorkflowInput =
      context.explicitWorkflowInput &&
      typeof context.explicitWorkflowInput === "object"
        ? context.explicitWorkflowInput
        : {};

    const hasUserGroundingContext =
      typeof context.originalUserInput === "string" &&
      context.originalUserInput.trim().length > 0;

    // Keep both the original request and the latest resume answer.
    // Resume input must not erase information already supplied by the user.
    const originalUserInput =
      typeof context.originalUserInput === "string"
        ? context.originalUserInput.trim()
        : "";

    const explicitUserInput =
      typeof context.explicitUserInput === "string"
        ? context.explicitUserInput.trim()
        : "";

    const userInput = [originalUserInput, explicitUserInput]
      .filter(Boolean)
      .join(" ");


    const missingUserFreeformFields = hasUserGroundingContext
      ? requiredFields.filter((field) => {
      const normalizedField = String(field).toLowerCase();

      if (!["message", "text", "body", "content", "description"].includes(normalizedField)) {
        return false;
      }

      const resumedValue = explicitWorkflowInput[field];
      if (
        resumedValue !== undefined &&
        resumedValue !== null &&
        String(resumedValue).trim() &&
        !isPlaceholderValue(resumedValue, field)
      ) {
        return false;
      }

      return !hasExplicitFreeformInput(userInput, field);
        })
      : [];

    // Preserve content from the original request when the current
    // resume answer only supplies another field such as the recipient.
    for (const field of requiredFields) {
      const normalizedField = String(field).toLowerCase();
      if (!["message", "text", "body", "content", "description"].includes(normalizedField)) {
        continue;
      }

      const existing = sanitizedData[field];
      if (
        existing !== undefined &&
        existing !== null &&
        String(existing).trim() &&
        !isPlaceholderValue(existing, field)
      ) {
        continue;
      }

      const extracted = extractFreeformInput(originalUserInput, field);
      if (extracted && !isPlaceholderValue(extracted, field)) {
        sanitizedData[field] = extracted;
      }
    }

    const explicitUserEmails = new Set([
      ...extractEmails(userInput),
      ...Object.values(explicitWorkflowInput).flatMap(extractEmails),
    ].map((email) => email.toLowerCase()));

    // Recipients are factual user data. Never allow the model, worker prompt,
    // or a downstream default to invent one. If a recipient field is present,
    // it must be grounded in an email address supplied by the user/resume.
    const recipientFields = requiredFields.filter(isRecipientField);
    const missingRecipientFields = hasUserGroundingContext
      ? recipientFields.filter((field) => {
      const value = sanitizedData[field];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() &&
        !isPlaceholderValue(value, field)
      ) {
        const suppliedEmails = extractEmails(String(value)).map((email) =>
          email.toLowerCase(),
        );
        return suppliedEmails.length === 0 ||
          suppliedEmails.some((email) => !explicitUserEmails.has(email));
      }

      return explicitUserEmails.size === 0;
        })
      : [];

    if (missingRecipientFields.length > 0) {
      return {
        status: "INPUT_REQUIRED",
        workflowId: workflow._id.toString(),
        workflowName: workflow.name,
        missingFields: missingRecipientFields,
        validationErrors: missingRecipientFields.map(
          (field) => `arguments.${field} must be supplied by the user`,
        ),
        message:
          "Additional workflow input is required before this workflow can run.",
      };
    }

    if (missingUserFreeformFields.length > 0) {
      return {
        status: "INPUT_REQUIRED",
        workflowId: workflow._id.toString(),
        workflowName: workflow.name,
        missingFields: missingUserFreeformFields,
        validationErrors: missingUserFreeformFields.map(
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
              : getRequiredMissingFields(
                  validation.errors,
                  sanitizedData,
                  workflow,
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
      const missingFields = getRequiredMissingFields(
        validation.errors,
        sanitizedData,
        workflow,
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

    const workflowResult = await triggerN8nWorkflow({
      workflowId: workflow._id.toString(),
      workflow: workflow.name,
      webhookUrl: workflow.webhook.url,
      data: sanitizedData,
      workerId: context.workerId,
      executionId: context.executionId,
      ...(context.toolTimeoutMs
        ? { timeoutMs: context.toolTimeoutMs }
        : {}),
    });

    if (workflowResult?.status === "INPUT_REQUIRED") {
      return {
        ...workflowResult,
        workflowId: workflow._id.toString(),
        workflowName: workflow.name,
        missingFields: workflowResult.missingFields || [],
      };
    }

    return workflowResult;
  },
};
