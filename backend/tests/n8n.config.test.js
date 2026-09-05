import { describe, expect, it, vi, beforeEach } from "vitest";

describe("n8n configuration", () => {
  beforeEach(() => {
    vi.resetModules();

    process.env.N8N_BASE_URL = "http://localhost:5678";
    delete process.env.N8N_WORKFLOW_AGENTFORGE_TEST;
  });

  it("rejects a workflow that is not configured", async () => {
    const { getN8nWorkflowUrl } = await import("../src/config/n8n.config.js");

    expect(() => getN8nWorkflowUrl("agentforge-test")).toThrow(
      "Unknown n8n workflow: agentforge-test",
    );
  });

  it("rejects an unknown workflow", async () => {
    const { getN8nWorkflowUrl } = await import("../src/config/n8n.config.js");

    expect(() => getN8nWorkflowUrl("unknown-workflow")).toThrow(
      "Unknown n8n workflow: unknown-workflow",
    );
  });

  it("rejects when the n8n base URL is missing", async () => {
    delete process.env.N8N_BASE_URL;
    process.env.N8N_WORKFLOW_AGENTFORGE_TEST = "webhook/agentforge/test";

    const { getN8nWorkflowUrl } = await import("../src/config/n8n.config.js");

    expect(() => getN8nWorkflowUrl("agentforge-test")).toThrow(
      "N8N_BASE_URL is not configured",
    );
  });
  it("builds the configured n8n workflow URL", async () => {
    process.env.N8N_BASE_URL = "http://localhost:5678";
    process.env.N8N_WORKFLOW_AGENTFORGE_TEST = "webhook/agentforge/test";

    const { getN8nWorkflowUrl } = await import("../src/config/n8n.config.js");

    expect(getN8nWorkflowUrl("agentforge-test")).toBe(
      "http://localhost:5678/webhook/agentforge/test",
    );
  });
});
