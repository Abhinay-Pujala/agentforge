class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(tool) {
    if (!tool || typeof tool !== "object") {
      throw new Error("Tool is required");
    }

    if (!tool.name || typeof tool.name !== "string") {
      throw new Error("Tool name is required");
    }

    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);

    return tool;
  }

  get(name) {
    return this.tools.get(name);
  }

  has(name) {
    return this.tools.has(name);
  }

  list() {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
    }));
  }

  getForWorker(enabledTools = []) {
    if (!Array.isArray(enabledTools)) {
      return [];
    }

    return enabledTools.map((toolName) => this.get(toolName)).filter(Boolean);
  }
}

export default ToolRegistry;
