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
    systemParts.push(`Instructions:\n${worker.instructions}`);
  }

  if (Array.isArray(context.workflowCatalog) && context.workflowCatalog.length > 0) {
    systemParts.push(
      `Workflow execution rules:
- When the user's request asks you to perform an action that matches an available workflow, use the n8n.trigger tool instead of only replying that you can do it.
- Choose the matching workflow from the available workflow catalog and pass its exact workflow ID.
- Include every value the user explicitly provided in the workflow data.
- If some required workflow data is missing, still call n8n.trigger with the information you have. Do not invent critical values. The workflow input validator will identify missing required fields and the runtime will pause for the user to provide them.
- Do not ask the user for required workflow fields before attempting the tool call when the workflow can be identified.
Available workflows:
${JSON.stringify(context.workflowCatalog, null, 2)}`,
    );
  }

  if (Object.keys(context).length > 0) {
    systemParts.push(`Runtime context:\n${JSON.stringify(context, null, 2)}`);
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
