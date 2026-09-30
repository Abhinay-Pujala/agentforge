import { describe, it, expect, vi, beforeEach } from "vitest";
import AgentRuntime from "../src/runtime/agent-runtime.service.js";
import ToolRegistry from "../src/tools/tool-registry.js";

const assertWorkflowAccessMock = vi.fn();
const triggerN8nWorkflowMock = vi.fn();

vi.mock("../src/services/workflow.service.js", () => ({
  assertWorkflowAccess: assertWorkflowAccessMock,
}));

vi.mock("../src/services/n8n.service.js", () => ({
  triggerN8nWorkflow: triggerN8nWorkflowMock,
}));

const { n8nTriggerTool } = await import("../src/tools/n8n-trigger.tool.js");

describe("AgentForge → n8n integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    assertWorkflowAccessMock.mockResolvedValue({
      _id: "workflow-123",
      name: "Gmail Automation",
      status: "enabled",
      webhook: { provider: "n8n", url: "https://example.com/webhook/gmail" },
      inputSchema: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
        additionalProperties: false,
      },
    });

    triggerN8nWorkflowMock.mockResolvedValue({
      success: true,
      result: { success: true, result: { message: "Hello from n8n" } },
    });
  });

  it("keeps greetings conversational even when a workflow is registered", async () => {
    const modelProvider = {
      generate: vi.fn().mockResolvedValue({
        output: "Hi! How can I help?",
        toolCalls: [],
      }),
    };

    const registry = new ToolRegistry();
    registry.register(n8nTriggerTool);
    const runtime = new AgentRuntime(modelProvider, registry);

    const result = await runtime.execute({
      worker: {
        _id: "worker-123",
        model: "test-model",
        instructions: "Be helpful.",
        enabledTools: ["n8n.trigger"],
        permissions: ["n8n.trigger"],
        workflowIds: ["workflow-123"],
      },
      input: "Hi",
      context: {
        userId: "user-123",
        workerId: "worker-123",
        workflowCatalog: [{
          id: "workflow-123",
          name: "Gmail Automation",
          description: "Send email through Gmail.",
          category: "email",
          inputSchema: { type: "object", properties: {}, required: [] },
        }],
      },
    });

    expect(result.output).toBe("Hi! How can I help?");
    expect(modelProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({ tools: [] }),
    );
    expect(triggerN8nWorkflowMock).not.toHaveBeenCalled();
  });

  it("keeps informational questions conversational", async () => {
    const modelProvider = {
      generate: vi.fn().mockResolvedValue({
        output: "You can use this worker to send emails.",
        toolCalls: [],
      }),
    };

    const registry = new ToolRegistry();
    registry.register(n8nTriggerTool);
    const runtime = new AgentRuntime(modelProvider, registry);

    await runtime.execute({
      worker: {
        _id: "worker-123",
        model: "test-model",
        instructions: "Be helpful.",
        enabledTools: ["n8n.trigger"],
        permissions: ["n8n.trigger"],
        workflowIds: ["workflow-123"],
      },
      input: "How do I send an email?",
      context: {
        userId: "user-123",
        workerId: "worker-123",
        workflowCatalog: [{
          id: "workflow-123",
          name: "Gmail Automation",
          description: "Send email through Gmail.",
          category: "email",
          inputSchema: { type: "object", properties: {}, required: [] },
        }],
      },
    });

    expect(triggerN8nWorkflowMock).not.toHaveBeenCalled();
  });

  it("executes a registered workflow through the real runtime", async () => {
    const modelProvider = {
      generate: vi.fn()
        .mockResolvedValueOnce({
          output: null,
          toolCalls: [{
            id: "n8n-call-1",
            tool: "n8n.trigger",
            arguments: {
              workflowId: "workflow-123",
              data: { message: "Hello from Worker" },
            },
          }],
        })
        .mockResolvedValueOnce({
          output: "Workflow completed successfully.",
          toolCalls: [],
          metadata: { usage: { total_tokens: 10, cost: 0.001 } },
        })
        .mockResolvedValueOnce({
          output: "Workflow completed successfully.",
          toolCalls: [],
          metadata: { usage: { total_tokens: 10, cost: 0.001 } },
        }),
    };

    const registry = new ToolRegistry();
    registry.register(n8nTriggerTool);

    const runtime = new AgentRuntime(modelProvider, registry);

    const worker = {
      _id: "worker-123",
      model: "test-model",
      instructions: "Use the registered workflow when requested.",
      enabledTools: ["n8n.trigger"],
      permissions: ["n8n.trigger"],
      workflowIds: ["workflow-123"],
    };

    const result = await runtime.execute({
      worker,
      input: "Send the message through Gmail.",
      context: {
        userId: "user-123",
        workerId: "worker-123",
        executionId: "execution-456",
        worker,
        workflowCatalog: [{
          id: "workflow-123",
          name: "Gmail Automation",
          description: "Send a message through Gmail.",
          category: "email",
          inputSchema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
            additionalProperties: false,
          },
        }],
      },
    });

    expect(result.output).toBe("Workflow completed successfully.");
    expect(assertWorkflowAccessMock).toHaveBeenCalledWith("workflow-123", "user-123");
    expect(triggerN8nWorkflowMock).toHaveBeenCalledWith({
      workflowId: "workflow-123",
      workflow: "Gmail Automation",
      webhookUrl: "https://example.com/webhook/gmail",
      data: { message: "Hello from Worker" },
      workerId: "worker-123",
      executionId: "execution-456",
    });
  });
});
