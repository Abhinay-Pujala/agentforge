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
- When the user's request matches an available workflow, you MUST call n8n.trigger. Do not replace the workflow call with a conversational response.
- Choose the matching workflow from the available workflow catalog and pass its exact workflow ID.
- Include only values explicitly provided by the user or safely resolved from previous tool results.
- Never invent, guess, or use placeholder values for required workflow fields.
- Never use words such as "recipient", "name", "email", "unknown", "user", "person", or similar placeholders as actual field values.
- If a required workflow field is missing, omit that field from data. Do not ask for it in text before the tool call.
- The workflow validator will detect missing required fields and return INPUT_REQUIRED, causing the execution to enter WAITING_FOR_INPUT.
- If a workflow requires a value that can be resolved by another available workflow, call the resolving workflow first.
- After a resolving workflow returns the required value, use that value in the next workflow call.
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
