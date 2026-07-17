import { OllamaProvider } from "../providers/ollama/ollama.provider.js";

export class ModelService {
  private readonly provider = new OllamaProvider();

  async getModels() {
    const response = await this.provider.listModels();

    return response.models.map((model: any) => ({
      name: model.name,
      family: model.details.family,
      parameters: model.details.parameter_size,
      quantization: model.details.quantization_level,
      size: model.size,
      capabilities: model.capabilities,
    }));
  }
}