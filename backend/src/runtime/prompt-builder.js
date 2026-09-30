/**
 * Builds the model prompt for a Worker execution.
 *
 * The model receives only the context it needs to make a decision:
 * Worker instructions, the registered workflow catalog, and resume state.
 * Internal execution IDs and server metadata stay outside the prompt.
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
    systemParts.push(`Worker instructions:\n${worker.instructions}`);
  }

  const workflows = Array.isArray(context.workflowCatalog)
    ? context.workflowCatalog
    : [];

  if (workflows.length > 0) {
    systemParts.push(
      `Workflow rules:
- Act as a normal Worker for conversation, questions, explanations, and capability requests.
- Use a registered workflow only when the user explicitly asks you to perform an actionable task that workflow can perform.
- Never trigger a workflow because one happens to be registered.
- Use the exact registered workflow ID. Never invent a workflow ID.
- Extract only values actually supplied by the user.
- Never invent recipients, dates, amounts, names, facts, or other important values.
- If a required value is missing, leave it missing. The workflow trigger will return INPUT_REQUIRED.
- Treat INPUT_REQUIRED and missingFields as authoritative. Stop and ask the user only for those missing values.
- Preserve values already collected during a paused execution.
- Follow Worker instructions for transformations. For example, an email Worker may create a concise subject and improve the user's message, but it must not invent the message itself.
- After successful workflow completion, do not trigger the workflow again.
Registered workflows:
${JSON.stringify(workflows, null, 2)}`,
    );
  }

  if (context.resumedFromExecutionId) {
    const resumeField =
      context.resumeTargetField || "the requested missing field";

    systemParts.push(
      `Resume rules:
- This is a continuation of a paused workflow.
- The user's latest answer belongs to ${resumeField}.
- Use the latest answer for that field without asking for it again.
- Preserve all previously collected workflow values.
- Trigger the workflow again only to continue the paused task.
- If the workflow still reports missingFields, ask only for those fields.`,
    );
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
