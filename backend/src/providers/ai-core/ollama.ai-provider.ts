import axios from "axios";

import { AiProviderCallError } from "../../errors/ai-core-provider.error.js";
import type {
  AiCoreChatOptions,
  AiCoreChatResult,
  AiCoreHealthCheckResult,
  AiCoreMessage,
  AiCoreProvider,
} from "../interfaces/ai-core-provider.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const REQUEST_TIMEOUT_MS = 300_000;

// LOCAL provider, no credentials (ADR-0020 Decision 1). Same wire contract
// as the existing OllamaProvider (backend/src/providers/ollama/
// ollama.provider.ts) — model/baseUrl/maxTokens come from the resolved
// AiRoutingPolicy/AiProvider row instead of process.env, since a Brain's
// policy decides this per call, not a global config value.
export class OllamaAiProvider implements AiCoreProvider {
  readonly key = "ollama";

  async chat(messages: AiCoreMessage[], options: AiCoreChatOptions): Promise<AiCoreChatResult> {
    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;

    try {
      const response = await axios.post(
        `${baseUrl}/api/chat`,
        {
          model: options.model,
          messages,
          stream: false,
          options: {
            num_predict: options.maxTokens ?? 500,
            ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          },
        },
        { timeout: REQUEST_TIMEOUT_MS }
      );

      return {
        model: response.data.model,
        content: response.data.message.content,
        raw: response.data,
      };
    } catch (error) {
      throw toAiProviderCallError(this.key, error);
    }
  }

  async healthCheck(baseUrlOverride?: string | null): Promise<AiCoreHealthCheckResult> {
    const baseUrl = baseUrlOverride || DEFAULT_BASE_URL;
    try {
      await axios.get(`${baseUrl}/api/tags`, { timeout: 5000 });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, message: error instanceof Error ? error.message : "Ollama is unreachable." };
    }
  }
}

function toAiProviderCallError(providerKey: string, error: unknown): AiProviderCallError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.error ?? error.message;
    return new AiProviderCallError(providerKey, `Ollama request failed: ${message}`, status);
  }
  return new AiProviderCallError(providerKey, error instanceof Error ? error.message : "Ollama request failed.");
}
