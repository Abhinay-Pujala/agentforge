import AgentRuntime from "./agent-runtime.service.js";
import OpenRouterProvider from "./providers/openrouter.provider.js";

export function createAgentRuntime() {
  const modelProvider = new OpenRouterProvider();

  return new AgentRuntime(modelProvider);
}
