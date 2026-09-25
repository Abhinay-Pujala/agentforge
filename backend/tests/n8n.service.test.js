import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";

let triggerN8nWorkflow;

beforeAll(async () => {
  vi.stubEnv("N8N_WEBHOOK_SECRET", "test-agentforge-secret");
  ({ triggerN8nWorkflow } = await import("../src/services/n8n.service.js"));
});

afterEach(() => vi.restoreAllMocks());

describe("n8n service", () => {
  const args = {
    workflowId: "workflow-123",
    workflow: "Gmail Automation",
    webhookUrl: "http://localhost:5678/webhook/gmail",
    data: { message: "Hello from AgentForge" },
    workerId: "worker-123",
    executionId: "execution-456",
  };

  it("triggers a registered workflow successfully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, result: { message: "Workflow completed" } }),
    }));

    const result = await triggerN8nWorkflow(args);

    expect(result).toEqual({
      success: true,
      result: { success: true, result: { message: "Workflow completed" } },
    });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(args.webhookUrl);
    expect(options.headers["X-AgentForge-Secret"]).toBe("test-agentforge-secret");
    expect(JSON.parse(options.body)).toEqual({
      workflowId: "workflow-123",
      workflow: "Gmail Automation",
      data: args.data,
      agentforge: { workerId: "worker-123", executionId: "execution-456" },
    });
  });

  it("throws a structured HTTP failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({
        success: false,
        error: { code: "N8N_INTERNAL_ERROR", message: "Workflow execution failed" },
      }),
    }));

    await expect(triggerN8nWorkflow(args)).rejects.toMatchObject({
      code: "N8N_INTERNAL_ERROR",
      status: 500,
    });
  });

  it("throws a timeout error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" }),
    ));

    await expect(triggerN8nWorkflow({ ...args, timeoutMs: 50 })).rejects.toMatchObject({
      code: "N8N_TIMEOUT",
    });
  });

  it("throws when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Connection refused")));

    await expect(triggerN8nWorkflow(args)).rejects.toMatchObject({
      code: "N8N_REQUEST_FAILED",
      message: "Connection refused",
    });
  });
});
