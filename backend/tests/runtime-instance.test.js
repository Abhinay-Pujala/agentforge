import { describe, it, expect, vi, beforeEach } from "vitest";

const registerMock = vi.fn();

vi.mock("../src/tools/tool-registry.js", () => {
  class MockToolRegistry {
    register(tool) {
      registerMock(tool);
    }
  }

  return {
    default: MockToolRegistry,
  };
});

vi.mock("../src/tools/calculator.tool.js", () => ({
  default: {
    name: "calculator",
    description: "Perform basic arithmetic calculations.",
    schema: {},
    execute: vi.fn(),
  },
}));

vi.mock("../src/runtime/providers/openrouter.provider.js", () => ({
  default: class MockOpenRouterProvider {},
}));

vi.mock("../src/runtime/agent-runtime.service.js", () => ({
  default: class MockAgentRuntime {
    constructor() {}
  },
}));

const { createAgentRuntime } =
  await import("../src/runtime/runtime-instance.js");

describe("createAgentRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the calculator tool in the runtime registry", () => {
    createAgentRuntime();

    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "calculator",
      }),
    );
  });
});
