/**
 * Builds provider-agnostic model messages from Worker configuration,
 * user input, and optional runtime context.
 *
 * @param {Object} worker
 * @param {string} input
 * @param {Object} [context={}]
 * @returns {Array<{role: "system"|"user", content: string}>}
 */
export function buildPrompt(worker, input, context = {}) {
  const systemParts = [];

  if (worker.name) {
    systemParts.push(`You are ${worker.name}.`);
  }

  if (worker.description) {
    systemParts.push(`Worker description: ${worker.description}`);
  }

  if (worker.instructions) {
    systemParts.push(`Instructions:\\n${worker.instructions}`);
  }

  if (
    Array.isArray(context.workflowCatalog) &&
    context.workflowCatalog.length > 0
  ) {
    systemParts.push(
      `Workflow execution rules:
- Behave as a normal worker for ordinary conversation, greetings, questions, explanations, and capability requests.
- Only use n8n.trigger when the user explicitly asks you to perform an actionable task that a registered workflow can perform.
- Never trigger a workflow merely because a workflow is registered or because the user asks what you can do.
- If exactly one workflow is available, use that workflow's exact ID for an actionable request.
- Extract known workflow fields from the user's request and put them in data.
- Follow the worker instructions for transformations. For example, an email worker should create a concise subject and improve the user's rough message before sending it.
- Never invent recipients, dates, amounts, facts, or other important values.
- If required user information is missing, omit that field. Do not guess it.
- The workflow result is authoritative. If it returns INPUT_REQUIRED and missingFields, stop the workflow attempt and ask the user for the missing information.
- On a resumed execution, put the user's latest answer into the field identified by resumeTargetField and preserve all previously collected workflow data.
- After a workflow completes successfully, never trigger that workflow again during the same execution.
Available workflows:
${JSON.stringify(context.workflowCatalog, null, 2)}`,
    );
  }

  if (context.resumedFromExecutionId) {
    const resumeField = context.resumeTargetField || "the missing workflow field";
    systemParts.push(
      `Resume instructions:
- This is a continuation of a paused workflow execution.
- The user's latest answer is authoritative for ${resumeField}.
- Put that answer into the workflow field ${resumeField}; do not ask the user for that same value again.
- Preserve previously collected workflow data.
- If other fields are derived by the worker, generate them from the collected data instead of asking the user for them.`,
    );
  }

  if (context.resumedFromExecutionId) {
    const resumeField = context.resumeTargetField || "the missing workflow field";
    systemParts.push(
      `Resume instructions:
- This is a continuation of a paused workflow execution.
- The user's latest answer is authoritative for ${resumeField}.
- Put that answer into the workflow field ${resumeField}; do not ask for that same value again.
- Preserve all previously collected workflow data.
- Re-check missingFields after the workflow trigger. If fields are still missing, ask only for those fields.`,
    );
  }

  if (Object.keys(context).length > 0) {
    const safeContext = {
      ...context,
      worker: undefined,
    };
    systemParts.push(`Runtime context:\\n${JSON.stringify(safeContext, null, 2)}`);
  }

  return [
    {
      role: "system",
      content: systemParts.join("\n\n"),
    },
    {
      role: "user",
      content: input,
    },
  ];
}
