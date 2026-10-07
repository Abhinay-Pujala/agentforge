import { describe, expect, it } from "vitest";
import {
  buildNaturalLanguageWorkflowData,
  buildWorkflowInstruction,
  isActionableWorkflowRequest,
  isNaturalLanguageWorkflow,
  scoreWorkflow,
  selectWorkflow,
} from "../src/runtime/workflow-router.js";

const gmailWorkflow = {
  id: "workflow-gmail",
  name: "Gmail Workflow",
  description: "AI-powered Gmail integration for reading, searching, drafting, replying to, and sending emails.",
  category: "productivity",
  capabilities: ["email", "gmail", "search", "reply"],
  status: "enabled",
  inputSchema: {
    type: "object",
    properties: {
      worker: { type: "string" },
      input: { type: "string" },
      timestamp: { type: "string" },
    },
    required: ["input"],
    additionalProperties: false,
  },
};

describe("workflow-router", () => {
  it("selects Gmail for natural-language email search and reply requests", () => {
    const result = selectWorkflow(
      [gmailWorkflow],
      "Check is there any email I got from KYP Gamers, if there is then reply to it",
    );

    expect(result.status).toBe("MATCHED");
    expect(result.workflow).toEqual(gmailWorkflow);
  });

  it("does not select a Gmail workflow for unrelated requests", () => {
    const result = selectWorkflow(
      [gmailWorkflow],
      "Explain how JavaScript promises work.",
    );

    expect(result.status).toBe("NONE");
    expect(result.workflow).toBeNull();
  });

  it("treats capability metadata as stronger than incidental description matches", () => {
    const result = scoreWorkflow(gmailWorkflow, "reply to the latest email");

    expect(result.score).toBeGreaterThan(20);
    expect(result.reasons).toEqual(
      expect.arrayContaining(["action:reply", "domain:email"]),
    );
  });

  it("detects natural-language workflow contracts", () => {
    expect(isNaturalLanguageWorkflow(gmailWorkflow)).toBe(true);
  });

  it("builds only fields allowed by the registered input schema", () => {
    const data = buildNaturalLanguageWorkflowData(
      gmailWorkflow,
      "Check my inbox.",
      { workerId: "worker-123" },
    );

    expect(data.worker).toBe("worker-123");
    expect(data.timestamp).toEqual(expect.any(String));
    expect(data.input).toContain("Original user request (authoritative): Check my inbox.");
    expect(data.input).toContain("Complete every action explicitly requested in the original request");
  });

  it("builds a complete instruction for conditional multi-step workflow requests", () => {
    const instruction = buildWorkflowInstruction(
      gmailWorkflow,
      "Check is there any email I got from KYP Gamers today, if there is then reply to it",
    );

    expect(instruction).toContain(
      "Original user request (authoritative): Check is there any email I got from KYP Gamers today, if there is then reply to it",
    );
    expect(instruction).toContain("Requested workflow actions detected: search, reply.");
    expect(instruction).toContain(
      "The request contains a conditional or sequential follow-up.",
    );
    expect(instruction).toContain(
      "do not stop after an intermediate lookup or check.",
    );\n    expect(instruction).toContain(
      "Execute prerequisite actions before evaluating whether dependent actions can proceed.",
    );
    expect(instruction).toContain(
      "search for the matching email first.",
    );
    expect(instruction).toContain(
      "If one exists but reply content is missing, return INPUT_REQUIRED for the reply message",
    );
    expect(instruction).toContain(
      "preserve the found email/thread identifiers for resume.",
    );
    expect(instruction).toContain(
      "Do not invent recipients, reply content, dates, identifiers, or other user-provided facts.",
    );
  });

  it("recognizes actionable requests without treating knowledge questions as workflow actions", () => {
    expect(isActionableWorkflowRequest("Show my latest emails")).toBe(true);
    expect(isActionableWorkflowRequest("What is email?")).toBe(false);
  });

  it("marks tied workflow candidates as ambiguous", () => {
    const calendarA = {
      ...gmailWorkflow,
      id: "workflow-a",
      name: "Email Search A",
      capabilities: ["email", "search"],
    };
    const calendarB = {
      ...gmailWorkflow,
      id: "workflow-b",
      name: "Email Search B",
      capabilities: ["email", "search"],
    };

    const result = selectWorkflow(
      [calendarA, calendarB],
      "Search my email",
    );

    expect(result.status).toBe("AMBIGUOUS");
    expect(result.workflow).toBeNull();
  });
});
