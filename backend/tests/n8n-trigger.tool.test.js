import { describe, it, expect, vi, beforeEach } from "vitest";

const assertWorkflowAccessMock = vi.fn();
const triggerN8nWorkflowMock = vi.fn();

vi.mock("../src/services/workflow.service.js", () => ({
  assertWorkflowAccess: assertWorkflowAccessMock,
}));

vi.mock("../src/services/n8n.service.js", () => ({
  triggerN8nWorkflow: triggerN8nWorkflowMock,
}));

const { n8nTriggerTool } = await import("../src/tools/n8n-trigger.tool.js");

describe("n8n.trigger tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    assertWorkflowAccessMock.mockResolvedValue({
      _id: "workflow-123",
      name: "Gmail Automation",
      status: "enabled",
      webhook: {
        provider: "n8n",
        url: "https://example.com/webhook/gmail",
      },
      inputSchema: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
        required: ["message"],
        additionalProperties: false,
      },
    });

    triggerN8nWorkflowMock.mockResolvedValue({
      success: true,
      result: { message: "Workflow completed" },
    });
  });

  it("resolves and triggers a registered workflow", async () => {
    const result = await n8nTriggerTool.execute(
      {
        workflowId: "workflow-123",
        data: { message: "Hello from Worker" },
      },
      {
        userId: "user-123",
        workerId: "worker-123",
        executionId: "execution-456",
        worker: {
          workflowIds: ["workflow-123"],
        },
      },
    );

    expect(assertWorkflowAccessMock).toHaveBeenCalledWith(
      "workflow-123",
      "user-123",
    );

    expect(triggerN8nWorkflowMock).toHaveBeenCalledWith({
      workflowId: "workflow-123",
      workflow: "Gmail Automation",
      webhookUrl: "https://example.com/webhook/gmail",
      data: { message: "Hello from Worker" },
      workerId: "worker-123",
      executionId: "execution-456",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a workflow not explicitly allowed for the worker", async () => {
    await expect(
      n8nTriggerTool.execute(
        {
          workflowId: "workflow-999",
          data: { message: "Hello" },
        },
        {
          userId: "user-123",
          workerId: "worker-123",
          executionId: "execution-456",
          worker: {
            workflowIds: ["workflow-123"],
          },
        },
      ),
    ).rejects.toMatchObject({
      code: "N8N_WORKFLOW_NOT_ALLOWED",
    });

    expect(assertWorkflowAccessMock).not.toHaveBeenCalled();
    expect(triggerN8nWorkflowMock).not.toHaveBeenCalled();
  });

  it("rejects invalid structured workflow input", async () => {
    await expect(
      n8nTriggerTool.execute(
        {
          workflowId: "workflow-123",
          data: {},
        },
        {
          userId: "user-123",
          workerId: "worker-123",
          executionId: "execution-456",
          worker: {
            workflowIds: ["workflow-123"],
          },
        },
      ),
    ).rejects.toMatchObject({
      code: "N8N_WORKFLOW_INPUT_INVALID",
    });

    expect(triggerN8nWorkflowMock).not.toHaveBeenCalled();
  });
});
