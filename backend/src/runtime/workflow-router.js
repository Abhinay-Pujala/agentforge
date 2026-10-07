const TOKEN_ALIASES = {
  search: new Set(["search", "find", "lookup", "look", "check", "show", "view", "see", "get", "retrieve", "fetch", "read", "list"]),
  reply: new Set(["reply", "replies", "replied", "respond", "response", "responding"]),
  send: new Set(["send", "sending", "sent", "deliver", "forward"]),
  draft: new Set(["draft", "drafts", "compose", "write"]),
  create: new Set(["create", "add", "make", "new", "book"]),
  update: new Set(["update", "edit", "change", "modify", "reschedule"]),
  delete: new Set(["delete", "remove", "cancel"]),
  schedule: new Set(["schedule", "scheduled", "book", "arrange", "plan"]),
};

const DOMAIN_ALIASES = {
  email: new Set(["email", "emails", "mail", "gmail", "inbox", "message", "messages"]),
  calendar: new Set(["calendar", "meeting", "meetings", "event", "events", "appointment", "appointments", "schedule"]),
};

const REQUEST_CONTEXT = new Set([
  "check", "show", "list", "view", "see", "find", "lookup", "search",
  "get", "fetch", "retrieve", "read", "send", "reply", "respond", "draft",
  "create", "add", "update", "edit", "delete", "remove", "schedule", "book",
  "cancel", "archive", "sync", "run", "execute", "trigger",
  "latest", "recent", "unread", "upcoming", "today", "tomorrow", "yesterday",
]);

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

function normalizedCapabilityTokens(workflow) {
  return [
    workflow?.name,
    workflow?.description,
    workflow?.category,
    ...(Array.isArray(workflow?.capabilities) ? workflow.capabilities : []),
  ].flatMap(tokenize);
}

function getActionMatches(inputTokens) {
  const matches = new Set();

  for (const [action, aliases] of Object.entries(TOKEN_ALIASES)) {
    if ([...aliases].some((alias) => inputTokens.has(alias))) {
      matches.add(action);
    }
  }

  return matches;
}

function getDomainMatches(inputTokens) {
  const matches = new Set();

  for (const [domain, aliases] of Object.entries(DOMAIN_ALIASES)) {
    if ([...aliases].some((alias) => inputTokens.has(alias))) {
      matches.add(domain);
    }
  }

  return matches;
}

function isKnowledgeQuestion(input) {
  const normalized = String(input || "").trim().toLowerCase();

  return (
    /^(?:what is|what are|why is|why are|how does|how do|explain|tell me about)\b/.test(
      normalized,
    ) &&
    !/\b(?:my|me|i|mine|today|tomorrow|yesterday|latest|recent|unread)\b/.test(
      normalized,
    )
  );
}

export function isActionableWorkflowRequest(input) {
  const tokens = new Set(tokenize(input));

  if (!tokens.size || isKnowledgeQuestion(input)) {
    return false;
  }

  if ([...tokens].some((token) => REQUEST_CONTEXT.has(token))) {
    return true;
  }

  return /\b(?:do i have|is there|are there|can you)\b/i.test(String(input || ""));
}

export function scoreWorkflow(workflow, input) {
  if (!workflow || workflow.status === "disabled") {
    return { score: 0, reasons: [] };
  }

  const inputTokens = new Set(tokenize(input));
  const workflowTokens = new Set(normalizedCapabilityTokens(workflow));
  const inputActions = getActionMatches(inputTokens);
  const inputDomains = getDomainMatches(inputTokens);

  const capabilityTokens = new Set(
    (Array.isArray(workflow.capabilities) ? workflow.capabilities : []).flatMap(
      tokenize,
    ),
  );

  const workflowActions = new Set();
  const workflowDomains = new Set();

  for (const token of capabilityTokens) {
    for (const [action, aliases] of Object.entries(TOKEN_ALIASES)) {
      if (aliases.has(token)) workflowActions.add(action);
    }

    for (const [domain, aliases] of Object.entries(DOMAIN_ALIASES)) {
      if (aliases.has(token)) workflowDomains.add(domain);
    }
  }

  const reasons = [];
  let score = 0;

  for (const token of inputTokens) {
    if (capabilityTokens.has(token)) {
      score += 8;
      reasons.push(`capability:${token}`);
    } else if (workflowTokens.has(token)) {
      score += 2;
      reasons.push(`metadata:${token}`);
    }
  }

  for (const action of inputActions) {
    if (workflowActions.has(action)) {
      score += 10;
      reasons.push(`action:${action}`);
    }
  }

  for (const domain of inputDomains) {
    if (workflowDomains.has(domain)) {
      score += 12;
      reasons.push(`domain:${domain}`);
    }
  }

  return { score, reasons: [...new Set(reasons)] };
}

export function selectWorkflow(workflowCatalog, input) {
  if (!Array.isArray(workflowCatalog) || workflowCatalog.length === 0) {
    return {
      status: "NONE",
      workflow: null,
      candidates: [],
    };
  }

  if (!isActionableWorkflowRequest(input)) {
    return {
      status: "NONE",
      workflow: null,
      candidates: [],
    };
  }

  const candidates = workflowCatalog
    .map((workflow) => ({
      workflow,
      ...scoreWorkflow(workflow, input),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      status: "NONE",
      workflow: null,
      candidates: [],
    };
  }

  const top = candidates[0];
  const second = candidates[1];

  if (second && top.score === second.score) {
    return {
      status: "AMBIGUOUS",
      workflow: null,
      candidates: candidates.slice(0, 5),
    };
  }

  return {
    status: "MATCHED",
    workflow: top.workflow,
    candidates,
  };
}

export function isNaturalLanguageWorkflow(workflow) {
  const schema = workflow?.inputSchema;

  if (!schema || schema.type !== "object") {
    return false;
  }

  const inputProperty = schema.properties?.input;

  return (
    inputProperty?.type === "string" &&
    (schema.required || []).includes("input")
  );
}

function getSupportedActions(workflow) {
  const capabilityTokens = new Set(
    (Array.isArray(workflow?.capabilities) ? workflow.capabilities : []).flatMap(
      tokenize,
    ),
  );

  return Object.entries(TOKEN_ALIASES)
    .filter(([, aliases]) => [...aliases].some((alias) => capabilityTokens.has(alias)))
    .map(([action]) => action);
}

function getRequestedActions(input) {
  return [...getActionMatches(new Set(tokenize(input)))];
}

function getRequestedActionsInOrder(input) {
  const tokens = tokenize(input);
  const actions = [];

  for (const token of tokens) {
    for (const [action, aliases] of Object.entries(TOKEN_ALIASES)) {
      if (aliases.has(token) && !actions.includes(action)) {
        actions.push(action);
        break;
      }
    }
  }

  return actions;
}

function hasConditionalFollowUp(input) {
  return /\b(?:if|when|once|after|then|otherwise|unless)\b/i.test(
    String(input || ""),
  );
}

export function buildWorkflowPlan(workflow, input, context = {}) {
  const originalRequest = String(input || "").trim();
  const actions = getRequestedActionsInOrder(originalRequest);

  return {
    version: 2,
    workflowId: workflow?.id || null,
    workflowName: workflow?.name || null,
    mode: "deterministic-workflow-execution",
    originalRequest,
    actions: actions.map((action, index) => ({
      id: `step-${index + 1}`,
      action,
      order: index + 1,
      dependsOn:
        hasConditionalFollowUp(originalRequest) && index > 0
          ? [`step-${index}`]
          : [],
      status: "PENDING",
    })),
    policy: {
      executeInOrder: true,
      evaluateConditionsBeforeDependentInput: true,
      neverInventUserInput: true,
      preserveCheckpointOnInputRequired: true,
      resumeFromCheckpoint: true,
    },
    resume: context?.resumedFromExecutionId
      ? {
          executionId: context.resumedFromExecutionId,
          pendingFields: context.missingWorkflowFields || [],
          checkpoint: context.pendingWorkflowData || {},
          latestUserInput: context.explicitUserInput || "",
        }
      : null,
  };
}

export function buildWorkflowInstruction(workflow, input, context = {}) {
  const originalRequest = String(input || "").trim();

  if (!originalRequest) {
    throw new Error("Workflow instruction cannot be built from empty input.");
  }

  const requestedActions = getRequestedActionsInOrder(originalRequest);
  const supportedActions = getSupportedActions(workflow);
  const executableActions = requestedActions.filter((action) =>
    supportedActions.includes(action),
  );

  const executionPlan = buildWorkflowPlan(workflow, originalRequest, context);

  const actionText =
    requestedActions.length > 0
      ? requestedActions.join(", ")
      : "the actions explicitly described in the original request";

  const unsupportedActions = requestedActions.filter(
    (action) => !supportedActions.includes(action),
  );

  const conditionalRule = hasConditionalFollowUp(originalRequest)
    ? [
        "The request contains a conditional or sequential follow-up.",
        "Execute prerequisite actions before evaluating whether dependent actions can proceed.",
        "Do not request input for a dependent action before its prerequisite condition has been evaluated.",
        "For example, for 'find an email and then reply', search for the matching email first. If none exists, finish with COMPLETED and do not request a reply message. If one exists but reply content is missing, return INPUT_REQUIRED for the reply message and preserve the found email/thread identifiers for resume.",
        "After receiving INPUT_REQUIRED data on resume, continue the pending dependent action using the preserved execution state; do not repeat completed prerequisite side effects unless necessary to recover state.",
      ].join(" ")
    : "Complete every action explicitly requested in the original request; do not stop after an intermediate step.";

  const supportNote =
    unsupportedActions.length > 0
      ? `The registered workflow does not explicitly advertise these detected actions: ${unsupportedActions.join(", ")}. Preserve them in the execution instruction and follow the workflow's actual capabilities rather than silently dropping them.`
      : null;

  return [
    "Execute the user's request completely using this registered workflow.",
    `Original user request (authoritative): ${originalRequest}`,
    `Requested workflow actions detected from the user's request: ${actionText}.`,
    conditionalRule,
    supportNote,
    "Preserve all factual details from the original request, including names, dates, filters, conditions, and requested follow-up actions.",
    "Do not invent recipients, reply content, dates, identifiers, or other user-provided facts.",
    "A missing value for a later dependent action is not a reason to skip its prerequisite actions.",
    "When INPUT_REQUIRED is necessary, return the exact missing fields and preserve all data already collected by previous workflow steps.",
    "Never return INPUT_REQUIRED for a dependent step before its prerequisite step has executed and established that the dependent step is applicable.",
    "For a search-then-action request, always perform the search first. If the search produces no matching item, return COMPLETED with a clear no-match result and do not request input for the later action.",
    "If a matching item exists but a required later value is missing, return INPUT_REQUIRED only then, including the missingFields and all identifiers/context required to resume.",
    "On resume, treat the persisted checkpoint as authoritative and continue from the first incomplete action. Do not repeat completed side effects.",
    "Return a structured JSON-compatible result with status exactly one of COMPLETED, INPUT_REQUIRED, or FAILED.",
    "For INPUT_REQUIRED include: { status: \"INPUT_REQUIRED\", missingFields: [...], message: \"...\", data: { ...checkpointData } }.",
    "For COMPLETED include: { status: \"COMPLETED\", message: \"...\", data: { ...resultData } }.",
    "For FAILED include: { status: \"FAILED\", error: { code: \"...\", message: \"...\" } }.",
    "Return the workflow result only after the requested operation has actually been completed, a deterministic INPUT_REQUIRED state has been reached after prerequisite actions, or a deterministic FAILED result is available.",
    "Execution plan (authoritative):",
    JSON.stringify(executionPlan),
  ].filter(Boolean).join("\n");
}

export function buildNaturalLanguageWorkflowData(workflow, input, context = {}) {
  if (!isNaturalLanguageWorkflow(workflow)) {
    throw new Error("Workflow does not use the natural-language input contract.");
  }

  const properties = workflow.inputSchema.properties || {};
  const originalInput = String(input || "").trim();

  if (!originalInput) {
    throw new Error("Workflow input cannot be empty.");
  }

  const data = {
    input: buildWorkflowInstruction(workflow, originalInput),
  };

  if (Object.prototype.hasOwnProperty.call(properties, "worker") && context.workerId) {
    data.worker = String(context.workerId);
  }

  if (Object.prototype.hasOwnProperty.call(properties, "timestamp")) {
    data.timestamp = new Date().toISOString();
  }

  return data;
}
\nexport { getRequestedActionsInOrder };\n