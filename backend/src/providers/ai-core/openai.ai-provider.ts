import axios from "axios";

import { AiProviderCallError, AiProviderCredentialMissingError } from "../../errors/ai-core-provider.error.js";
import type {
  AiCoreChatOptions,
  AiCoreChatResult,
  AiCoreHealthCheckResult,
  AiCoreMessage,
  AiCoreProvider,
} from "../interfaces/ai-core-provider.js";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const REQUEST_TIMEOUT_MS = 300_000;

// HOSTED provider — thin translation to OpenAI's Chat Completions API only.
// No SDK dependency added; a plain REST call keeps this plugin as thin as
// OllamaAiProvider and avoids introducing a new dependency for a single
// endpoint (IMPLEMENTATION_RULES.md: "Never introduce unnecessary
// dependencies"). Credentials are resolved by AiRoutingService via
// CredentialManagerService.decrypt() and passed in per call — never read
// from process.env.
export class OpenAiAiProvider implements AiCoreProvider {
  readonly key = "openai";

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

    try {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model: options.model,
          messages,
          max_tokens: options.maxTokens ?? 500,
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        },
        {
          timeout: REQUEST_TIMEOUT_MS,
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      const choice = response.data.choices?.[0];

      return {
        model: response.data.model,
        content: choice?.message?.content ?? "",
        tokensIn: response.data.usage?.prompt_tokens,
        tokensOut: response.data.usage?.completion_tokens,
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
      await axios.get(`${baseUrl}/models`, { timeout: 5000, headers: { Authorization: `Bearer ${apiKey}` } });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, message: error instanceof Error ? error.message : "OpenAI is unreachable." };
    }
  }
}

function toAiProviderCallError(providerKey: string, error: unknown): AiProviderCallError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message ?? error.message;
    return new AiProviderCallError(providerKey, `OpenAI request failed: ${message}`, status, error.code);
  }
  return new AiProviderCallError(providerKey, error instanceof Error ? error.message : "OpenAI request failed.");
}
