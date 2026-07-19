import { OllamaProvider } from "../providers/ollama/ollama.provider.js";
import { ApiError } from "../errors/api-error.js";

export class ModelService {
  private readonly provider = new OllamaProvider();

  async getModels() {
    let response;

    try {
      response = await this.provider.listModels();
    } catch {
      throw new ApiError(503, "Unable to connect to AI provider.");
    }

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
