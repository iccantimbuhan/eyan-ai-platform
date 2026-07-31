import { AiCoreProviderFactory } from "./ai-core-provider.factory.js";
import { OllamaAiProvider } from "./ai-core/ollama.ai-provider.js";
import { OpenAiAiProvider } from "./ai-core/openai.ai-provider.js";
import { AnthropicAiProvider } from "./ai-core/anthropic.ai-provider.js";
import { GeminiAiProvider } from "./ai-core/gemini.ai-provider.js";
import { logger } from "../lib/logger.js";

export function registerAiCoreProviders(): void {
  AiCoreProviderFactory.register("ollama", OllamaAiProvider);
  AiCoreProviderFactory.register("openai", OpenAiAiProvider);
  AiCoreProviderFactory.register("anthropic", AnthropicAiProvider);
  AiCoreProviderFactory.register("gemini", GeminiAiProvider);
}

export function validateAiCoreProviderConfig(): void {
  const registered = AiCoreProviderFactory.listRegistered();
  if (registered.length === 0) {
    logger.warn("[AiCoreProviderFactory] No AI Core providers are registered.");
  }
}
