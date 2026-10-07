import { describe, expect, it } from "vitest";
import { routeWorkflow } from "../src/runtime/workflow-router.js";

const gmail = {
  id: "gmail-1",
  name: "Gmail Workflow",
  description: "AI-powered Gmail integration for reading, searching, replying and sending email",
  category: "email",
  capabilities: ["email","gmail","search","reply","send"],
  status: "enabled",
};

describe("workflow router", () => {
  it("routes an actionable Gmail request", () => {
    const result = routeWorkflow("Check if I got an email from KYP Gamers today and reply to it.", [gmail]);
    expect(result.needsWorkflow).toBe(true);
    expect(result.workflow.id).toBe("gmail-1");
  });

  it("does not route knowledge questions", () => {
    const result = routeWorkflow("What is an email API?", [gmail]);
    expect(result.needsWorkflow).toBe(false);
  });

  it("does not route when there are no workflows", () => {
    expect(routeWorkflow("Check my email", [])).toMatchObject({ needsWorkflow: false });
  });
});
