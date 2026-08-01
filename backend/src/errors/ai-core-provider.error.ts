import { ApiError } from "./api-error.js";

export class UnsupportedAiProviderError extends ApiError {
  constructor(providerKey: string) {
    super(400, `Unsupported AI Core provider: "${providerKey}".`);
    this.name = "UnsupportedAiProviderError";
  }
}

// Thrown by an AiCoreProvider plugin on any failed call. providerStatusCode
// carries the upstream HTTP status when one exists (undefined for a network-
// level failure, e.g. ECONNREFUSED or a timeout) — AiRoutingService's
// classifyFailure() uses this to distinguish SCHEMA_INVALID/TRANSIENT_FAILURE
// (retryable) from DEFINITIVE_FAILURE (not retryable), mirroring the
// Classify Ollama Result logic already proven in
// eyan-automation-hub/workflows/crm/03-ai-qualification.json.
export class AiProviderCallError extends ApiError {
  readonly providerKey: string;
  readonly providerStatusCode?: number;
  // The underlying network-level error code (e.g. "ECONNREFUSED",
  // "ECONNABORTED" for a timeout) when there was no HTTP response at all —
  // undefined whenever providerStatusCode is set. Sprint 4: lets chat error
  // diagnostics (src/lib/ai-chat-error-classifier.ts) distinguish "provider
  // unreachable" from "provider responded slowly/timed out" without
  // string-matching the message.
  readonly code?: string;

  constructor(providerKey: string, message: string, providerStatusCode?: number, code?: string) {
    super(502, message);
    this.name = "AiProviderCallError";
    this.providerKey = providerKey;
    this.providerStatusCode = providerStatusCode;
    this.code = code;
  }
}

export class AiProviderCredentialMissingError extends ApiError {
  constructor(providerKey: string) {
    super(400, `AI Core provider "${providerKey}" requires credentials, but none were resolved.`);
    this.name = "AiProviderCredentialMissingError";
  }
}

// Sprint 4 (AI Chat Stabilization) — an already-classified conversation/chat
// failure. AiConversationService throws this (never a raw AiProviderCallError)
// so callers like ChatService need no provider-specific knowledge to handle
// it correctly: it's already an ApiError with the right status/user-facing
// message, plus a `category` for structured logging.
export class AiConversationError extends ApiError {
  readonly category: string;

  constructor(status: number, message: string, category: string) {
    super(status, message);
    this.name = "AiConversationError";
    this.category = category;
  }
}
