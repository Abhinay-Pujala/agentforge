import { validateToolArguments } from "./tool-schema-validator.js";

class ToolExecutionService {
  constructor(toolRegistry) {
    if (!toolRegistry || typeof toolRegistry.get !== "function") {
      throw new Error("A valid tool registry is required");
    }

    this.toolRegistry = toolRegistry;
  }

  async execute({
    toolName,
    arguments: toolArguments,
    timeoutMs = 10_000,
    permissions = [],
    context = {},
  }) {
    const tool = this.toolRegistry.get(toolName);

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    if (tool.permission && !permissions.includes(tool.permission)) {
      const error = new Error(`Permission denied for tool: ${tool.name}`);

      error.code = "TOOL_PERMISSION_DENIED";

      throw error;
    }

    const validation = validateToolArguments(toolArguments, tool.schema);

    if (!validation.valid) {
      throw new Error(
        `Invalid arguments for tool ${tool.name}: ${validation.errors.join(
          ", ",
        )}`,
      );
    }

    if (typeof tool.execute !== "function") {
      throw new Error(`Tool is not executable: ${tool.name}`);
    }

    let timeout;

    try {
      return await Promise.race([
        Object.keys(context).length > 0
          ? tool.execute(toolArguments, context)
          : tool.execute(toolArguments),
        new Promise((_, reject) => {
          timeout = setTimeout(() => {
            const error = new Error(`Tool execution timed out: ${tool.name}`);

            error.code = "TOOL_TIMEOUT";

            reject(error);
          }, timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export default ToolExecutionService;
