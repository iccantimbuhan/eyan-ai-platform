export interface AiCoreMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCoreChatOptions {
  model: string;
  maxTokens?: number;
  temperature?: number;
  // The AiProvider row's baseUrl (LOCAL providers like Ollama) — null for
  // hosted providers using their SDK/REST default endpoint.
  baseUrl?: string | null;
}

export interface AiCoreChatResult {
  model: string;
  content: string;
  tokensIn?: number;
  tokensOut?: number;
  raw: unknown;
}

export interface AiCoreHealthCheckResult {
  healthy: boolean;
  message?: string;
}

// One incremental piece of a streamed response. `raw` carries the
// provider's own unmodified chunk object (e.g. one parsed Ollama NDJSON
// line) so a caller that needs the exact original wire shape — ChatService,
// preserving today's NDJSON response format for the (untouched) frontend —
// can re-serialize it verbatim, while `delta`/`done` give every other
// caller a normalized, provider-independent view of the same chunk.
export interface AiCoreStreamChunk {
  delta: string;
  done: boolean;
  raw: unknown;
}

// A pluggable text-generation provider — the shape every AI Core provider
// plugin implements. Deliberately separate from the existing single-provider
// `AIProvider` interface (backend/src/providers/interfaces/ai-provider.ts,
// ADR-0001) — that interface stays completely unchanged so ChatService/
// ProviderFactory keep working exactly as built (TDD Phase 1: zero existing
// call sites change). model/baseUrl/credentials are always passed explicitly
// per call (resolved from AiRoutingPolicy/AiProvider/AiProviderCredential by
// AiRoutingService), never read from process env — a Brain's routing policy,
// not a global env var, decides which provider/model a given call uses.
//
// Per IMPLEMENTATION_RULES.md ("Providers only translate requests and
// responses... Routing belongs exclusively to AiRoutingService"): a plugin
// never retries, never falls back, never persists anything, and never
// decides what counts as retryable — it only translates one request and one
// response (or throws AiProviderCallError so AiRoutingService can classify
// the failure).
export interface AiCoreProvider {
  readonly key: string;
  chat(
    messages: AiCoreMessage[],
    options: AiCoreChatOptions,
    credentials?: Record<string, unknown>
  ): Promise<AiCoreChatResult>;

  // A cheap reachability check — mirrors McpConnector.healthCheck()
  // (ADR-0012's own connector contract) applied to a text-generation
  // provider instead of an MCP server. Never a chat() call (no cost, no
  // model-selection concern) — AiProviderHealthService (TDD §14) is the
  // only caller.
  healthCheck(baseUrl?: string | null, credentials?: Record<string, unknown>): Promise<AiCoreHealthCheckResult>;

  // Sprint 4 — optional so existing/future providers with no streaming
  // wire format (or not yet implemented, e.g. OpenAI/Anthropic/Gemini
  // today) simply omit it; AiConversationService checks for its presence
  // and falls back to a clear "streaming not supported" error rather than
  // guessing. Only OllamaAiProvider implements this in Sprint 4, per the
  // brief's "only Ollama needs to be fully implemented" scope.
  streamChat?(
    messages: AiCoreMessage[],
    options: AiCoreChatOptions,
    credentials?: Record<string, unknown>
  ): AsyncGenerator<AiCoreStreamChunk>;
}
