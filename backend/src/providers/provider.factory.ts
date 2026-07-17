import { OllamaProvider } from "./ollama/ollama.provider.js";
import type { AIProvider } from "./interfaces/ai-provider.js";

export class ProviderFactory {
  static create(): AIProvider {
    return new OllamaProvider();
  }
}