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

describe("n8n workflow input resolution", () => {
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
          to: { type: "string", description: "Recipient email" },
          subject: { type: "string", description: "Email subject" },
          message: { type: "string", description: "Email body" },
        },
        required: ["to", "subject", "message"],
        additionalProperties: false,
      },
    });
  });

  it("returns structured missing fields instead of failing", async () => {
    const result = await n8nTriggerTool.execute(
      {
        workflowId: "workflow-123",
        data: { subject: "Meeting", message: "Tomorrow at 10 AM" },
      },
      {
        userId: "user-123",
        workerId: "worker-123",
        executionId: "execution-456",
        worker: { workflowIds: ["workflow-123"] },
      },
    );

    expect(result).toEqual({
      status: "INPUT_REQUIRED",
      workflowId: "workflow-123",
      workflowName: "Gmail Automation",
      missingFields: ["to"],
      message: "Additional workflow input is required before this workflow can run.",
    });

    expect(triggerN8nWorkflowMock).not.toHaveBeenCalled();
  });

  it("still rejects invalid non-missing input", async () => {
    await expect(
      n8nTriggerTool.execute(
        {
          workflowId: "workflow-123",
          data: {
            to: 123,
            subject: "Meeting",
            message: "Tomorrow at 10 AM",
          },
        },
        {
          userId: "user-123",
          workerId: "worker-123",
          executionId: "execution-456",
          worker: { workflowIds: ["workflow-123"] },
        },
      ),
    ).rejects.toMatchObject({
      code: "N8N_WORKFLOW_INPUT_INVALID",
    });
  });
});
