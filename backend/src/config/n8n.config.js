const N8N_BASE_URL = process.env.N8N_BASE_URL;

const N8N_WORKFLOWS = {
  "agentforge-test": process.env.N8N_WORKFLOW_AGENTFORGE_TEST,
};

export function getN8nWorkflowUrl(workflow) {
  if (!N8N_BASE_URL) {
    throw new Error("N8N_BASE_URL is not configured");
  }

  const webhookPath = N8N_WORKFLOWS[workflow];

  if (!webhookPath) {
    const error = new Error(`Unknown n8n workflow: ${workflow}`);
    error.code = "N8N_WORKFLOW_NOT_CONFIGURED";
    throw error;
  }

  return `${N8N_BASE_URL.replace(/\/$/, "")}/${webhookPath.replace(/^\//, "")}`;
}
