import { describe, expect, it, vi, beforeEach } from "vitest";

const { triggerN8nWorkflowMock } = vi.hoisted(() => ({ triggerN8nWorkflowMock: vi.fn() }));

vi.mock("../src/services/n8n.service.js", () => ({
  triggerN8nWorkflow: triggerN8nWorkflowMock,
}));

import WorkerExecutionEngine from "../src/runtime/worker-flow/worker-execution-engine.js";

const worker = {
  _id: "worker-1",
  name: "Assistant",
  description: "General assistant",
  instructions: "Be helpful.",
  model: "test-model",
  configuration: {},
};

const gmail = {
  id: "gmail-1",
  name: "Gmail Workflow",
  description: "AI-powered Gmail integration for reading, searching, replying and sending email",
  category: "email",
  capabilities: ["email","gmail","search","reply","send"],
  status: "enabled",
  webhook: { provider: "n8n", url: "http://localhost:5678/webhook/agentforge-gmail-agent" },
  inputSchema: {
    type: "object",
    properties: { worker: {type:"string"}, input: {type:"string"}, timestamp: {type:"string"} },
    required: ["input"],
    additionalProperties: false,
  },
};

describe("WorkerExecutionEngine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the complete original request to n8n exactly once", async () => {
    triggerN8nWorkflowMock.mockResolvedValue({
      success: true,
      status: "COMPLETED",
      result: { message: "Found the email and replied successfully." },
    });

    const engine = new WorkerExecutionEngine({
      modelProvider: { generate: vi.fn() },
    });

    const input = "Check if I got an email from KYP Gamers today and reply to it.";
    const result = await engine.execute({
      worker,
      input,
      context: { workflowCatalog: [gmail] },
      executionPolicy: {},
      executionId: "execution-1",
    });

    expect(triggerN8nWorkflowMock).toHaveBeenCalledTimes(1);
    expect(triggerN8nWorkflowMock).toHaveBeenCalledWith(expect.objectContaining({
      workflowId: "gmail-1",
      data: expect.objectContaining({ input }),
    }));
    expect(result.output).toBe("Found the email and replied successfully.");
    expect(result.metadata.mode).toBe("workflow");
  });

  it("uses normal AI when no workflow is needed", async () => {
    const generate = vi.fn().mockResolvedValue({
      output: "An API is an interface that lets software communicate.",
      toolCalls: [],
      metadata: { provider: "test" },
    });
    const engine = new WorkerExecutionEngine({ modelProvider: { generate } });

    const result = await engine.execute({
      worker,
      input: "What is an API?",
      context: { workflowCatalog: [gmail] },
      executionPolicy: {},
      executionId: "execution-2",
    });

    expect(triggerN8nWorkflowMock).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.metadata.mode).toBe("chat");
  });

  it("propagates n8n failures so the controller can mark FAILED", async () => {
    const error = new Error("n8n unavailable");
    error.code = "N8N_REQUEST_FAILED";
    error.statusCode = 502;
    triggerN8nWorkflowMock.mockRejectedValue(error);

    const engine = new WorkerExecutionEngine({ modelProvider: { generate: vi.fn() } });

    await expect(engine.execute({
      worker,
      input: "Check my email today",
      context: { workflowCatalog: [gmail] },
      executionPolicy: {},
      executionId: "execution-3",
    })).rejects.toThrow("n8n unavailable");
  });
});
