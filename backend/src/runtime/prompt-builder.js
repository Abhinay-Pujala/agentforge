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
- This worker is configured to execute one registered workflow for each user request. Call n8n.trigger exactly once for the selected workflow.
- If exactly one workflow is available to this worker, use that workflow's exact ID. Do not select a different workflow.
- Extract workflow fields from the user's natural-language request and put them in data. For an email request, for example, "send an email saying the meeting is tomorrow" means the message is "the meeting is tomorrow".
- Follow the worker instructions when transforming user-provided information, such as creating a concise subject or polishing an email body.
- Never invent factual values, placeholders, recipients, dates, amounts, or other important details that the user did not provide.
- If a required field is genuinely missing, omit that field from data. Do not fabricate it and do not answer with a text question before the tool call.
- The workflow validator is the source of truth for required fields. If it returns INPUT_REQUIRED, stop and let the runtime request that field from the user.
- After the workflow succeeds, do not call n8n.trigger again.
Available workflows:
${JSON.stringify(context.workflowCatalog, null, 2)}`,
    );
  }

  if (Object.keys(context).length > 0) {
    systemParts.push(`Runtime context:\\n${JSON.stringify(context, null, 2)}`);
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
