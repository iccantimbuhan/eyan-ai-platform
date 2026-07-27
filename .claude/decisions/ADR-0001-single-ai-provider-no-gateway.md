# ADR-0001 — Single AI Provider, No Gateway or Multi-Provider Routing

## Context

Sprint 1 needed to add AI-powered content generation to Content Studio. An existing `ChatService` → `ProviderFactory` → `OllamaProvider` chain already worked for the Chat feature. Sprint 1.1's benchmark on the actual production VPS (AMD EPYC, 6 vCPU, 11GB RAM, no GPU) measured ~3 tokens/sec on a 7B model, with a 14B model failing to respond within several minutes and no memory headroom to run a second model or provider concurrently.

## Decision

Content generation reuses the existing `ChatService`/`ProviderFactory`/`OllamaProvider` chain unmodified — no new provider abstraction was introduced for content generation. More broadly, the platform stays on a single AI provider; no AI Gateway or multi-provider routing layer has been added anywhere.

## Alternatives Considered

- **A dedicated content-generation provider path parallel to chat.** Rejected — duplicates working infrastructure for no benefit; `ChatService.chat()` already does exactly what content generation needs.
- **An AI Gateway / multi-provider routing layer to allow choosing between providers per feature.** Rejected for now — hardware cannot reliably run more than one model's worth of inference capacity at a time, so provider choice is not a real user-facing option on this deployment today.

## Consequences

All AI-powered features share one provider and one model until the hardware changes. Adding a second provider or a gateway later remains possible without reversing this decision — `ChatService` already sits behind a clean `AIProvider` interface — but it hasn't been needed yet and shouldn't be built speculatively ahead of that need.
