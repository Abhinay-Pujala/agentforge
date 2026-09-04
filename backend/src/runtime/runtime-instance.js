import AgentRuntime from "./agent-runtime.service.js";
import OpenRouterProvider from "./providers/openrouter.provider.js";
import ToolRegistry from "../tools/tool-registry.js";
import calculatorTool from "../tools/calculator.tool.js";

export function createAgentRuntime() {
  const provider = new OpenRouterProvider();

  const toolRegistry = new ToolRegistry();

  toolRegistry.register(calculatorTool);

  return new AgentRuntime(provider, toolRegistry);
}
