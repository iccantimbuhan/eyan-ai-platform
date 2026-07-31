import axios from "axios";

import { AiProviderCallError, AiProviderCredentialMissingError } from "../../errors/ai-core-provider.error.js";
import type {
  AiCoreChatOptions,
  AiCoreChatResult,
  AiCoreHealthCheckResult,
  AiCoreMessage,
  AiCoreProvider,
} from "../interfaces/ai-core-provider.js";

const DEFAULT_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";
const REQUEST_TIMEOUT_MS = 300_000;

// HOSTED provider — thin translation to Anthropic's Messages API. Anthropic
// takes the system prompt as a top-level field, not a "system" message in
// the messages array, so this plugin splits it out — the one piece of
// per-provider request-shape translation this interface exists to hide from
// AiRoutingService.
export class AnthropicAiProvider implements AiCoreProvider {
  readonly key = "anthropic";

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
    const conversationMessages = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role, content: message.content }));

    try {
      const response = await axios.post(
        `${baseUrl}/messages`,
        {
          model: options.model,
          max_tokens: options.maxTokens ?? 500,
          ...(systemMessages.length > 0 ? { system: systemMessages.join("\n\n") } : {}),
          messages: conversationMessages,
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        },
        {
          timeout: REQUEST_TIMEOUT_MS,
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": ANTHROPIC_VERSION,
          },
        }
      );

      const textBlock = response.data.content?.find((block: { type: string }) => block.type === "text");

      return {
        model: response.data.model,
        content: textBlock?.text ?? "",
        tokensIn: response.data.usage?.input_tokens,
        tokensOut: response.data.usage?.output_tokens,
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
      await axios.get(`${baseUrl}/models`, {
        timeout: 5000,
        headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
      });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, message: error instanceof Error ? error.message : "Anthropic is unreachable." };
    }
  }
}

function toAiProviderCallError(providerKey: string, error: unknown): AiProviderCallError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message ?? error.message;
    return new AiProviderCallError(providerKey, `Anthropic request failed: ${message}`, status);
  }
  return new AiProviderCallError(providerKey, error instanceof Error ? error.message : "Anthropic request failed.");
}
