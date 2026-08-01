import axios from "axios";

import { AiProviderCallError } from "../../errors/ai-core-provider.error.js";
import type {
  AiCoreChatOptions,
  AiCoreChatResult,
  AiCoreHealthCheckResult,
  AiCoreMessage,
  AiCoreProvider,
  AiCoreStreamChunk,
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

  // Line-delimited JSON, exactly Ollama's own /api/chat stream=true wire
  // format — each line is one complete JSON object. TCP chunks never align
  // with line boundaries, so incoming bytes are buffered and split on '\n'
  // as they arrive, same technique the legacy OllamaProvider's caller
  // (ChatService) used to just pipe verbatim; here it's parsed so
  // AiConversationService can persist/inspect each delta.
  async *streamChat(messages: AiCoreMessage[], options: AiCoreChatOptions): AsyncGenerator<AiCoreStreamChunk> {
    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;

    let response;
    try {
      response = await axios.post(
        `${baseUrl}/api/chat`,
        {
          model: options.model,
          messages,
          stream: true,
          options: {
            num_predict: options.maxTokens ?? 500,
            ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          },
        },
        { timeout: REQUEST_TIMEOUT_MS, responseType: "stream" }
      );
    } catch (error) {
      throw toAiProviderCallError(this.key, error);
    }

    let buffer = "";

    try {
      for await (const chunk of response.data as AsyncIterable<Buffer>) {
        buffer += chunk.toString("utf8");

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line) {
            const parsed = parseStreamLine(line);
            if (parsed) {
              yield {
                delta: parsed?.message?.content ?? "",
                done: Boolean(parsed?.done),
                raw: parsed,
              };
            }
          }

          newlineIndex = buffer.indexOf("\n");
        }
      }
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

// Malformed lines are skipped defensively rather than aborting the whole
// stream — a single garbled chunk shouldn't kill an otherwise-good response
// the client is already receiving.
function parseStreamLine(line: string): { message?: { content?: string }; done?: boolean } | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function toAiProviderCallError(providerKey: string, error: unknown): AiProviderCallError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.error ?? error.message;
    return new AiProviderCallError(providerKey, `Ollama request failed: ${message}`, status, error.code);
  }
  return new AiProviderCallError(providerKey, error instanceof Error ? error.message : "Ollama request failed.");
}
