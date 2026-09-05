import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

import AgentRuntime from "../src/runtime/agent-runtime.service.js";
import ToolRegistry from "../src/tools/tool-registry.js";

let ToolExecutionService;
let n8nTriggerTool;

beforeAll(async () => {
  vi.stubEnv("N8N_BASE_URL", "http://localhost:5678");
  vi.stubEnv("N8N_WORKFLOW_AGENTFORGE_TEST", "webhook/agentforge/test");
  vi.stubEnv("N8N_WEBHOOK_SECRET", "test-agentforge-secret");

  ({ default: ToolExecutionService } =
    await import("../src/tools/tool-execution.service.js"));

  ({ n8nTriggerTool } = await import("../src/tools/n8n-trigger.tool.js"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AgentForge → n8n integration", () => {
  it("executes n8n.trigger through the real runtime and returns the workflow result", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          result: {
            message: "Hello from n8n",
            workflow: "agentforge-test",
          },
        }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const modelProvider = {
      generate: vi
        .fn()
        .mockResolvedValueOnce({
          output: null,
          toolCalls: [
            {
              id: "n8n-call-1",
              tool: "n8n.trigger",
              arguments: {
                workflow: "agentforge-test",
                data: {
                  message: "Hello from Worker",
                },
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          output: "Workflow completed successfully.",
          toolCalls: [],
          metadata: {
            usage: {
              prompt_tokens: 100,
              completion_tokens: 30,
              total_tokens: 130,
              cost: 0.002,
            },
          },
        }),
    };

    const toolRegistry = new ToolRegistry();
    toolRegistry.register(n8nTriggerTool);

    const toolExecutionService = new ToolExecutionService(toolRegistry);

    const runtime = new AgentRuntime(
      modelProvider,
      toolRegistry,
      toolExecutionService,
    );

    const worker = {
      _id: "worker-123",
      name: "Test Worker",
      model: "test-model",
      instructions: "Use the n8n workflow when requested.",
      enabledTools: ["n8n.trigger"],
      permissions: ["n8n.trigger"],
      configuration: {
        n8n: {
          workflow: "agentforge-test",
        },
      },
    };

    const result = await runtime.execute({
      worker,
      input: "Trigger the AgentForge test workflow.",
      context: {
        userId: "user-123",
        workerId: "worker-123",
        executionId: "execution-456",
        worker,
      },
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe("Workflow completed successfully.");

    expect(result.toolCalls).toHaveLength(1);

    expect(result.toolCalls[0]).toMatchObject({
      id: "n8n-call-1",
      tool: "n8n.trigger",
      arguments: {
        workflow: "agentforge-test",
        data: {
          message: "Hello from Worker",
        },
      },
      result: {
        success: true,
        result: {
          success: true,
          result: {
            message: "Hello from n8n",
            workflow: "agentforge-test",
          },
        },
      },
      status: "COMPLETED",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe("http://localhost:5678/webhook/agentforge/test");

    expect(options.method).toBe("POST");

    expect(options.headers).toEqual({
      "Content-Type": "application/json",
      "X-AgentForge-Secret": "test-agentforge-secret",
    });

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

    expect(modelProvider.generate).toHaveBeenCalledTimes(2);
  });
});
