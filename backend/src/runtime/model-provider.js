class ModelProvider {
  async generate(request) {
    throw new Error("ModelProvider.generate() must be implemented");
  }
}

export default ModelProvider;
