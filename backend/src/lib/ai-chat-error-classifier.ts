import axios from "axios";

import {
  AiProviderCallError,
  AiProviderCredentialMissingError,
  UnsupportedAiProviderError,
} from "../errors/ai-core-provider.error.js";

// Sprint 4 (AI Chat Stabilization) — replaces the single generic "Unable to
// connect to AI provider." message with a differentiated diagnosis. Used by
// ChatService for both the non-streaming and streaming paths; intentionally
// separate from AiRoutingService's own classifyFailure() (which classifies
// into AiCallOutcome for retry/fallback purposes, not user-facing
// messaging) — that Sprint 2/3 logic is untouched by this sprint.
export type AiChatErrorCategory =
  | "PROVIDER_UNAVAILABLE"
  | "MODEL_UNAVAILABLE"
  | "MODEL_LOADING"
  | "TIMEOUT"
  | "STREAMING_FAILURE"
  | "CONFIGURATION_ERROR";

export interface AiChatErrorClassification {
  category: AiChatErrorCategory;
  httpStatus: number;
  userMessage: string;
}

export interface ClassifyChatErrorOptions {
  // True once headers/bytes have already been sent for a streaming
  // response — the fallback branch for an otherwise-unclassifiable error
  // then reads as a mid-stream break rather than a plain connection
  // failure.
  streaming?: boolean;
  // Cheap signal from OllamaAiProvider's /api/ps probe (see
  // probeOllamaModelLoaded below) — when a TIMEOUT-shaped failure
  // coincides with the target model NOT being in the currently-loaded
  // list, it's far more likely a cold load in progress than a genuinely
  // stuck request. Ollama's chat API itself exposes no separate "loading"
  // state, so this is the closest real signal available. null/undefined
  // when the probe wasn't run or didn't resolve.
  modelLoaded?: boolean | null;
}

const TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);
const UNREACHABLE_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", "ENETUNREACH"]);

const USER_MESSAGES: Record<AiChatErrorCategory, string> = {
  PROVIDER_UNAVAILABLE: "Unable to connect to the AI provider. Please try again shortly.",
  MODEL_UNAVAILABLE: "The requested AI model is not available.",
  MODEL_LOADING: "The AI model is still loading — please try again in a moment.",
  TIMEOUT: "The AI provider took too long to respond. Please try again.",
  STREAMING_FAILURE: "The AI response was interrupted. Please try again.",
  CONFIGURATION_ERROR: "AI Chat is not configured correctly. Please contact an administrator.",
};

const HTTP_STATUS: Record<AiChatErrorCategory, number> = {
  PROVIDER_UNAVAILABLE: 503,
  MODEL_UNAVAILABLE: 502,
  MODEL_LOADING: 503,
  TIMEOUT: 504,
  STREAMING_FAILURE: 502,
  CONFIGURATION_ERROR: 500,
};

export function classifyChatError(
  error: unknown,
  options: ClassifyChatErrorOptions = {}
): AiChatErrorClassification {
  const category = resolveCategory(error, options);
  return {
    category,
    httpStatus: HTTP_STATUS[category],
    userMessage: USER_MESSAGES[category],
  };
}

function resolveCategory(error: unknown, options: ClassifyChatErrorOptions): AiChatErrorCategory {
  if (error instanceof UnsupportedAiProviderError) return "CONFIGURATION_ERROR";
  if (error instanceof AiProviderCredentialMissingError) return "CONFIGURATION_ERROR";

  if (error instanceof AiProviderCallError) {
    const status = error.providerStatusCode;

    if (status !== undefined) {
      if (status === 404) return "MODEL_UNAVAILABLE";
      if (status === 408) return "TIMEOUT";
      if (status >= 500) return "PROVIDER_UNAVAILABLE";
      return "MODEL_UNAVAILABLE";
    }

    // No HTTP response at all — a network-level failure, distinguished by
    // the underlying connection error code.
    if (error.code && TIMEOUT_CODES.has(error.code)) {
      return options.modelLoaded === false ? "MODEL_LOADING" : "TIMEOUT";
    }
    if (error.code && UNREACHABLE_CODES.has(error.code)) return "PROVIDER_UNAVAILABLE";

    return options.streaming ? "STREAMING_FAILURE" : "PROVIDER_UNAVAILABLE";
  }

  return options.streaming ? "STREAMING_FAILURE" : "PROVIDER_UNAVAILABLE";
}

// Best-effort only: a short timeout and a swallowed failure, since this is
// purely a diagnostic aid for classification and must never itself become a
// new source of hangs or errors while the caller is already handling one.
export async function probeOllamaModelLoaded(baseUrl: string, model: string): Promise<boolean | null> {
  try {
    const response = await axios.get(`${baseUrl}/api/ps`, { timeout: 3000 });
    const models = response.data?.models as Array<{ model?: string; name?: string }> | undefined;
    if (!Array.isArray(models)) return null;
    return models.some((entry) => entry.model === model || entry.name === model);
  } catch {
    return null;
  }
}
