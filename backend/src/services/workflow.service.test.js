import { describe, it, expect } from "vitest";
import {
  getWorkflowConfigurationStatus,
  withWorkflowConfigurationStatus,
} from "./workflow.service.js";

describe("workflow configuration status", () => {
  it("marks an enabled n8n workflow with a valid URL as ready", () => {
    expect(
      getWorkflowConfigurationStatus({
        status: "enabled",
        webhook: {
          provider: "n8n",
          url: "http://localhost:5678/webhook/test",
        },
      }),
    ).toMatchObject({
      code: "READY",
      label: "Ready",
    });
  });

  it("marks disabled workflows as disabled", () => {
    expect(
      getWorkflowConfigurationStatus({
        status: "disabled",
        webhook: {
          provider: "n8n",
          url: "http://localhost:5678/webhook/test",
        },
      }),
    ).toMatchObject({
      code: "DISABLED",
      label: "Disabled",
    });
  });

  it("requires configuration when the webhook URL is missing", () => {
    expect(
      getWorkflowConfigurationStatus({
        status: "enabled",
        webhook: { provider: "n8n", url: "" },
      }),
    ).toMatchObject({
      code: "CONFIGURATION_REQUIRED",
      label: "Configuration Required",
    });
  });

  it("requires configuration when the provider is unsupported", () => {
    expect(
      getWorkflowConfigurationStatus({
        status: "enabled",
        webhook: {
          provider: "unsupported",
          url: "http://localhost:5678/webhook/test",
        },
      }),
    ).toMatchObject({
      code: "CONFIGURATION_REQUIRED",
    });
  });

  it("adds configuration status without removing workflow fields", () => {
    const workflow = {
      _id: "workflow-123",
      name: "Gmail Automation",
      status: "enabled",
      webhook: {
        provider: "n8n",
        url: "http://localhost:5678/webhook/test",
      },
    };

    expect(withWorkflowConfigurationStatus(workflow)).toMatchObject({
      _id: "workflow-123",
      name: "Gmail Automation",
      configurationStatus: {
        code: "READY",
        label: "Ready",
      },
    });
  });
});
