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

  constructor(providerKey: string, message: string, providerStatusCode?: number) {
    super(502, message);
    this.name = "AiProviderCallError";
    this.providerKey = providerKey;
    this.providerStatusCode = providerStatusCode;
  }
}

export class AiProviderCredentialMissingError extends ApiError {
  constructor(providerKey: string) {
    super(400, `AI Core provider "${providerKey}" requires credentials, but none were resolved.`);
    this.name = "AiProviderCredentialMissingError";
  }
}
