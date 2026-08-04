# ADR-0002 — Configurable Generation Limits via the Config Layer

## Context

Sprint 1.1's benchmark showed generation time scales directly and unavoidably with output length (~3 tokens/sec regardless of size) on the current hardware. Different AI features are reasonably expected to want different maximum output lengths in the future (a short chat reply vs. a full blog post, for example).

## Decision

Maximum generated tokens is a configuration value (`OLLAMA_MAX_TOKENS`, default 500) threaded through a new `ChatOptions` type on the `AIProvider` interface and `ChatService`, rather than hardcoded inside `OllamaProvider`. Callers may pass a different limit per call; if they don't, the config-layer default applies.

## Alternatives Considered

- **Hardcode a fixed `num_predict` value in `OllamaProvider`.** Rejected — makes it impossible for future features with different needs to get a different limit without editing provider code.
- **Leave generation length unbounded.** Rejected — this was the original state, and it's what produced unpredictable, sometimes multi-minute-plus generations with no way to bound worst-case latency.

## Consequences

Every AI feature currently shares one default limit (500 tokens) unless it explicitly passes a different one via `ChatOptions`. No feature has exercised the per-call override yet — this was built as foundation only, per Sprint 1.1's explicit scope, not paired with an actual differentiated use case yet.
