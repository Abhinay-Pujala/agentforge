import AgentRuntime from "./agent-runtime.service.js";
import OpenRouterProvider from "./providers/openrouter.provider.js";
import ToolRegistry from "../tools/tool-registry.js";
import calculatorTool from "../tools/calculator.tool.js";
import { n8nTriggerTool } from "../tools/n8n-trigger.tool.js";

export function createAgentRuntime() {
  const provider = new OpenRouterProvider();

  const toolRegistry = new ToolRegistry();

  toolRegistry.register(calculatorTool);
  toolRegistry.register(n8nTriggerTool);

  return new AgentRuntime(provider, toolRegistry);
}
