import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import ToolExecutionService from "../src/tools/tool-execution.service.js";
import ToolRegistry from "../src/tools/tool-registry.js";

let n8nTriggerTool;

beforeAll(async () => {
  vi.stubEnv("N8N_BASE_URL", "http://localhost:5678");
  vi.stubEnv("N8N_WORKFLOW_AGENTFORGE_TEST", "webhook/agentforge/test");

  ({ n8nTriggerTool } = await import("../src/tools/n8n-trigger.tool.js"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("n8n.trigger permissions", () => {
  it("denies execution when the worker lacks n8n.trigger permission", async () => {
    const registry = new ToolRegistry();
    registry.register(n8nTriggerTool);

    const service = new ToolExecutionService(registry);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      service.execute({
        toolName: "n8n.trigger",
        arguments: {
          workflow: "agentforge-test",
          data: {
            message: "Should not be sent",
          },
        },
        permissions: [],
      }),
    ).rejects.toMatchObject({
      code: "TOOL_PERMISSION_DENIED",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows execution when the worker has n8n.trigger permission", async () => {
    const registry = new ToolRegistry();
    registry.register(n8nTriggerTool);

    const service = new ToolExecutionService(registry);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          result: {
            message: "Workflow completed",
          },
        }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await service.execute({
      toolName: "n8n.trigger",
      arguments: {
        workflow: "agentforge-test",
        data: {
          message: "Allowed Request",
        },
      },
      permissions: ["n8n.trigger"],
      context: {
        workerId: "worker-123",
        executionId: "execution-123",
        worker: {
          configuration: {
            n8n: {
              workflow: "agentforge-test",
            },
          },
        },
      },
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
