import axios from "axios";

import { AiProviderCallError, AiProviderCredentialMissingError } from "../../errors/ai-core-provider.error.js";
import type {
  AiCoreChatOptions,
  AiCoreChatResult,
  AiCoreHealthCheckResult,
  AiCoreMessage,
  AiCoreProvider,
} from "../interfaces/ai-core-provider.js";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 300_000;

// HOSTED provider — thin translation to Gemini's generateContent REST API.
// Gemini has no "system" role in its contents array; a system message is
// sent via the separate systemInstruction field, and roles are "user"/
// "model" rather than "user"/"assistant" — translated here, the same kind
// of per-provider shape difference AnthropicAiProvider hides for its API.
export class GeminiAiProvider implements AiCoreProvider {
  readonly key = "gemini";

  async chat(
    messages: AiCoreMessage[],
    options: AiCoreChatOptions,
    credentials?: Record<string, unknown>
  ): Promise<AiCoreChatResult> {
    const apiKey = credentials?.apiKey;
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw new AiProviderCredentialMissingError(this.key);
    }

    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    const systemMessages = messages.filter((message) => message.role === "system").map((message) => message.content);
    const contents = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));

    try {
      const response = await axios.post(
        `${baseUrl}/models/${options.model}:generateContent`,
        {
          contents,
          ...(systemMessages.length > 0
            ? { systemInstruction: { parts: [{ text: systemMessages.join("\n\n") }] } }
            : {}),
          generationConfig: {
            maxOutputTokens: options.maxTokens ?? 500,
            ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          },
        },
        {
          timeout: REQUEST_TIMEOUT_MS,
          headers: { "x-goog-api-key": apiKey },
        }
      );

      const candidate = response.data.candidates?.[0];
      const text = candidate?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";

      return {
        model: options.model,
        content: text,
        tokensIn: response.data.usageMetadata?.promptTokenCount,
        tokensOut: response.data.usageMetadata?.candidatesTokenCount,
        raw: response.data,
      };
    } catch (error) {
      throw toAiProviderCallError(this.key, error);
    }
  }

  async healthCheck(baseUrlOverride?: string | null, credentials?: Record<string, unknown>): Promise<AiCoreHealthCheckResult> {
    const apiKey = credentials?.apiKey;
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      return { healthy: false, message: "No credentials configured." };
    }

    const baseUrl = baseUrlOverride || DEFAULT_BASE_URL;
    try {
      await axios.get(`${baseUrl}/models`, { timeout: 5000, headers: { "x-goog-api-key": apiKey } });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, message: error instanceof Error ? error.message : "Gemini is unreachable." };
    }
  }
}

function toAiProviderCallError(providerKey: string, error: unknown): AiProviderCallError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message ?? error.message;
    return new AiProviderCallError(providerKey, `Gemini request failed: ${message}`, status, error.code);
  }
  return new AiProviderCallError(providerKey, error instanceof Error ? error.message : "Gemini request failed.");
}
