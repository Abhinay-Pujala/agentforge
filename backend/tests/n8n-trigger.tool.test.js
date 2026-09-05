import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

let n8nTriggerTool;

beforeAll(async () => {
  vi.stubEnv("N8N_BASE_URL", "http://localhost:5678");
  vi.stubEnv("N8N_WORKFLOW_AGENTFORGE_TEST", "webhook/agentforge/test");

  ({ n8nTriggerTool } = await import("../src/tools/n8n-trigger.tool.js"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("n8n.trigger tool", () => {
  it("triggers an n8n workflow with worker and execution context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            result: {
              message: "Workflow completed",
            },
          }),
      }),
    );

    const result = await n8nTriggerTool.execute(
      {
        workflow: "agentforge-test",
        data: {
          message: "Hello from Worker",
        },
      },
      {
        workerId: "worker-123",
        executionId: "execution-456",
        worker: {
          configuration: {
            n8n: {
              workflow: "agentforge-test",
            },
          },
        },
      },
    );

    expect(result.success).toBe(true);
    expect(result.result.success).toBe(true);

    expect(fetch).toHaveBeenCalledTimes(1);

    const [, options] = fetch.mock.calls[0];

    expect(JSON.parse(options.body)).toEqual({
      workflow: "agentforge-test",
      data: {
        message: "Hello from Worker",
      },
      agentforge: {
        workerId: "worker-123",
        executionId: "execution-456",
      },
    });
  });
});
