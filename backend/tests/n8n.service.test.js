import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";

let triggerN8nWorkflow;

beforeAll(async () => {
  vi.stubEnv("N8N_BASE_URL", "http://localhost:5678");
  vi.stubEnv("N8N_WORKFLOW_AGENTFORGE_TEST", "webhook/agentforge/test");
  vi.stubEnv("N8N_WEBHOOK_SECRET", "test-agentforge-secret");

  ({ triggerN8nWorkflow } = await import("../src/services/n8n.service.js"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("n8n service", () => {
  it("triggers a configured n8n workflow successfully", async () => {
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

    const result = await triggerN8nWorkflow({
      workflow: "agentforge-test",
      data: {
        message: "Hello from AgentForge",
      },
      workerId: "worker-123",
      executionId: "execution-456",
    });

    expect(result).toEqual({
      success: true,
      result: {
        success: true,
        result: {
          message: "Workflow completed",
        },
      },
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe("http://localhost:5678/webhook/agentforge/test");

    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["X-AgentForge-Secret"]).toBe(
      "test-agentforge-secret",
    );

    expect(JSON.parse(options.body)).toEqual({
      workflow: "agentforge-test",
      data: {
        message: "Hello from AgentForge",
      },
      agentforge: {
        workerId: "worker-123",
        executionId: "execution-456",
      },
    });
  });
  it("throws a structured error when n8n returns an HTTP failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () =>
          JSON.stringify({
            success: false,
            error: {
              code: "N8N_INTERNAL_ERROR",
              message: "Workflow execution failed",
            },
          }),
      }),
    );

    await expect(
      triggerN8nWorkflow({
        workflow: "agentforge-test",
        data: {
          message: "Hello from AgentForge",
        },
        workerId: "worker-123",
        executionId: "execution-456",
      }),
    ).rejects.toMatchObject({
      code: "N8N_INTERNAL_ERROR",
      message: "Workflow execution failed",
      status: 500,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("throws a timeout error when the n8n request times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new Error("The operation was aborted"), {
          name: "AbortError",
        }),
      ),
    );

    await expect(
      triggerN8nWorkflow({
        workflow: "agentforge-test",
        data: {
          message: "Hello from AgentForge",
        },
        workerId: "worker-123",
        executionId: "execution-456",
        timeoutMs: 50,
      }),
    ).rejects.toMatchObject({
      code: "N8N_TIMEOUT",
      message: "n8n workflow request timed out",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("throws a standardized error when the n8n request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Connection refused")),
    );

    await expect(
      triggerN8nWorkflow({
        workflow: "agentforge-test",
        data: {
          message: "Hello from AgentForge",
        },
        workerId: "worker-123",
        executionId: "execution-456",
      }),
    ).rejects.toMatchObject({
      code: "N8N_REQUEST_FAILED",
      message: "Connection refused",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
