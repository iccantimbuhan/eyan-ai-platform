# Sprint 4.2 — Real AI Image Provider Integration

Status: Planning only for the phases described below. Prepared 2026-07-24 at the close of Sprint 4.1.

**Note on "Phase 0" naming:** a phase actually named "Sprint 4.2, Phase 0" has since been completed — see `tasks/completed/sprint-4-2-phase-0-production-readiness.md`. It covered configuration validation, request validation, error handling, logging, and code cleanup for the Sprint 4.1 pipeline, but **not** the items this document's own "Phase 0 — Architectural prerequisites" describes below (rate limiting, timeout reconciliation, a provider-credential config convention, an error-mapping strategy, deploying to production). Those remain open and are still a prerequisite before real provider work becomes production-default, but did not block starting the first real provider (see next note).

**Note on provider order:** the "Recommended Implementation Order" below (OpenAI → Stability → Gemini → FLUX) was **not** followed. **Gemini** was implemented first, directly, per explicit direction — see `tasks/completed/sprint-4-2-phase-1-gemini-provider.md`. The reasoning in this section (why Stability before Gemini, etc.) no longer reflects what actually happened; the architecture readiness review, risks, and required-configuration sections below remain accurate for whichever provider is implemented next and are not affected by this reordering.

Sprint 4.1 built and fully validated the internal image-generation pipeline — ownership, orchestration, lifecycle, storage — using a deterministic `FakeImageProvider` and zero external cost. Sprint 4.2 is where that architecture gets tested against reality: real HTTP calls, real latency, real failure modes, real money.

---

## Provider Options

### 1. OpenAI Images

- **Why included**: The most mature, lowest-friction option — single API key, one bearer-token auth model already familiar from nothing else in this codebase but conceptually simple, synchronous request/response.
- **Implementation complexity**: Low. One POST request; the response contains the image (as a URL to download or inline base64) within the same HTTP round-trip — no polling, no webhook, no job state to track. Fits `ImageService.generate()`'s current synchronous shape with zero structural change.
- **API integration approach**: `axios` (already a dependency, used identically by `OllamaProvider`) directly against the REST endpoint — no SDK needed. Map `GenerateImageRequest` → their request shape, map their response → `GenerateImageResponse`.
- **Advantages**: Simplest integration; best first real-provider proof point; built-in content moderation reduces the need to build our own prompt-safety layer immediately; mature, stable API.
- **Future considerations**: Fixed size options (not arbitrary width/height — see API Considerations below); cost per image; moderation rejections need to surface as a distinct error class from provider outages (see Risks).

### 2. Stability AI

- **Why included**: Historically the most parameter-rich option, and its negative-prompt support maps directly onto our existing `GenerateImageRequest.negativePrompt` field — the only provider on this list where that field isn't a translation, it's a native match.
- **Implementation complexity**: Low–Medium. Their current image endpoints are synchronous (request in, image bytes out), same shape as OpenAI. The extra complexity is request-parameter mapping (steps, cfg_scale, sampler) — our interface is deliberately minimal, so provider-specific tuning knobs should get sane hardcoded defaults inside the `StabilityAIProvider` class itself, not leak into the shared `ImageProvider` interface.
- **API integration approach**: Same pattern as OpenAI — `axios`, synchronous, no SDK required.
- **Advantages**: Native negative-prompt fit; credit-based pricing is predictable; mature, image-gen-specific vendor.
- **Future considerations**: Credit/billing model differs from per-request-token billing (needs its own cost-tracking mental model); model-version selection (multiple SD versions) is an ongoing choice, not a one-time one.

### 3. Gemini (Google)

- **Why included**: A third synchronous, low-complexity option, and a useful test of whether the current config pattern (`env.ts`, per-provider prefixed vars) generalizes cleanly to a provider with a genuinely different auth shape than the other two.
- **Implementation complexity**: Low–Medium. Synchronous call, image bytes/base64 returned directly — same request/response shape as the other two. The friction is entirely in credential setup (Google Cloud API key or service account, not a simple bearer token), which is new to this codebase.
- **API integration approach**: `axios` or the official Google SDK — worth a small spike to see which is less friction for auth handling specifically; no async/polling either way.
- **Advantages**: Strong prompt adherence in general use; Google infrastructure reliability.
- **Future considerations**: Separate billing/credential surface from OpenAI/Stability; regional availability; distinct content-policy shape to map into our error handling.

### 4. FLUX

- **Why included**: Frequently cited for quality-to-cost ratio, and open-weight, which keeps a future self-hosting path notionally open — though not soon (see below).
- **Implementation complexity**: **Higher than the other three, and qualitatively different.** No hosted FLUX aggregator (Replicate, fal.ai, Together.ai, ...) offers a synchronous call — they all use submit-a-job-then-poll (or webhook) semantics. To keep `ImageProvider.generate()`'s contract synchronous from `ImageService`'s point of view, the polling loop has to live *inside* the FLUX provider class, meaning the HTTP request from our own API can stay open for however long the underlying job takes. That's precisely the risk class that caused Sprint 3's production incident (three independently-configured timeouts never reconciled against real generation time) — now for a provider we don't control the latency of.
- **API integration approach**: Submit request → poll status endpoint (or accept a webhook, which would require its own new endpoint and a bigger architectural change) → fetch result on completion. Self-hosting is not realistic short-term: ADR-0001 already established this VPS has no GPU, so "self-host FLUX" isn't a Sprint 4.2-adjacent option, only a hosted aggregator is.
- **Advantages**: Cost/quality tradeoff; open-weight flexibility; a real second data point (after Sprint 4.1's `FakeImageProvider`) for whether this architecture needs an async generation model, not just an async *provider*.
- **Future considerations**: Choice of aggregator is itself a decision; self-hosting remains blocked on hardware; the timeout-reconciliation lesson applies here more than to any other provider on this list.

---

## Recommended Implementation Order

The prompt that scoped this planning suggested **OpenAI Images → FLUX → Gemini → Stability AI**. My recommendation differs on the middle two, and I want to be explicit about why rather than silently defer to the original list.

**Recommended: OpenAI Images → Stability AI → Gemini → FLUX.**

- **OpenAI Images first** — no disagreement here. Lowest friction, synchronous, best proof that the Sprint 4.1 architecture holds up against a real, billed API with zero structural surprises.
- **Stability AI second, not FLUX.** Stability is *also* synchronous and low-complexity, and its native negative-prompt fit makes it a clean second data point for one specific question: does `ImageProviderFactory`'s registry genuinely support multiple real providers without touching `ImageService`, routes, or the frontend contract? Proving that with a second *easy* provider is a cleaner test than proving it with a second *hard* one — if something breaks, it's obviously the registry's fault, not confused with FLUX's polling complexity.
- **Gemini third** — same reasoning as Stability: another synchronous provider, and specifically exercises whether the config/credential pattern generalizes to an auth shape that isn't a simple bearer token, before anything harder is layered on top.
- **FLUX last, deliberately.** It's the one provider on this list that isn't just "a new provider," it's a new *request pattern* (async/polling) inside a currently fully-synchronous pipeline. Attempting it second — immediately after the one proof-of-concept provider — means debugging two unknowns at once (is the registry pattern right? is the polling pattern right?) if anything goes wrong. Doing it last means the registry pattern is already proven three times over by then, isolating FLUX's real, structural question: does this architecture need to revisit ADR-0005 (async/background generation, deferred at Sprint 1.1) before FLUX ships, given a polling provider makes the cost of staying synchronous much more visible than the three providers before it. I'd rather make that call with three real providers' worth of latency data already in hand than guess at it now.

---

## Architecture Readiness Review

**What Sprint 4.1 already provides, unchanged, for every provider above:**

- `ImageProvider` interface + `ImageProviderFactory` registry — adding a provider is one new class + one new `register()` call in `register-image-providers.ts`. No change to `ImageService`, controllers, routes, or validators for any of the four.
- Full orchestration already handles the entire lifecycle correctly: `PENDING` row before any external call, `COMPLETED`/`FAILED` transition, storage cleanup on delete, provider-failure vs. storage-failure error paths, the DB-layer-failure-after-success edge case fixed in Phase 5.
- `StorageProvider`/`LocalDiskStorageProvider` is provider-agnostic already — none of the four AI providers above need any storage-layer change.
- Error handling scaffolding (`ImageGenerationError`, `UnsupportedImageProviderError`, `ImageProviderNotConfiguredError`) is provider-agnostic and ready to be thrown from any new provider class.

**What's genuinely new work, per provider**: one class implementing `ImageProvider`, provider-specific config in `env.ts`, an HTTP integration (mapping request/response shapes and errors), and unit tests with a mocked HTTP client — the same shape of work as `OllamaProvider`, which this codebase already has a working, if untested, precedent for.

**Architectural improvements to make *before* the first real provider ships — not optional, not deferred further:**

1. **Rate limiting / cost control.** Sprint 4.1 deliberately shipped without this — the `FakeImageProvider` has no cost, so there was nothing to protect against. That stops being true the moment any real provider is registered. This is the single highest-priority item and should be its own gated phase before OpenAI Images goes live, the same way Sprint 3.5 gated Sprint 4.1.
2. **Three-layer timeout reconciliation**, revisited for images specifically. Sprint 3's production incident is the direct precedent: frontend axios timeout, backend provider timeout, nginx reverse-proxy timeout must all be set deliberately against real observed provider latency, not discovered in production. This matters even for the three synchronous providers, and matters a great deal more for FLUX.
3. **A single config convention for provider credentials**, decided once, followed four times — see Required Configuration below. Deciding this now avoids provider #2 and #3 inventing slightly different patterns.
4. **A shared error-mapping strategy.** Right now every provider failure becomes a flat `ImageGenerationError` (502). Once real providers are involved, "the provider rejected this prompt for content-policy reasons" (the user's fault, arguably a 4xx) and "the provider had an outage" (not the user's fault, a 502) are different situations that deserve different responses. Worth deciding the shape of this once, before four providers each invent their own.
5. **Deploy Sprint 4.1 to production.** Its migrations are already live; its application code is not. Sprint 4.2 shouldn't be built and tested against a codebase state that itself was never actually deployed — recommend closing that gap first or in parallel with Sprint 4.2's first phase.
6. **An explicit decision on synchronous vs. async generation**, ahead of FLUX specifically (see Recommended Order above) — not a blocker for OpenAI/Stability/Gemini, but should be made deliberately rather than discovered under a FLUX-shaped time pressure.

---

## Implementation Strategy

For each new provider: add `backend/src/providers/<name>/<name>-image.provider.ts` implementing `ImageProvider`; register it in `register-image-providers.ts` (extend the existing function, don't restructure it); add provider-specific config to `env.ts` following its existing pattern (a documented default where one makes sense, `requireEnv()` where a value is mandatory for that provider to function); write unit tests against a mocked HTTP client, following the same `vi.mock` pattern already used for `LocalDiskStorageProvider`'s tests. **`ImageService`, the routes, the controller, and the validators should not need to change for any of the four providers** — if implementing one of them requires touching those files, that's a signal the Sprint 4.1 abstraction has a gap worth stopping to address before continuing, not something to route around.

---

## Risks

- **Real cost exposure** — this is the platform's first billed, external-API-dependent feature. No cost-control exists yet (see Architecture Readiness Review #1).
- **Content moderation / policy rejections** need to surface distinctly from genuine provider outages, or every rejected prompt looks like a 502 server error to the frontend (see Architecture Readiness Review #4).
- **Real latency variance.** The `FakeImageProvider` responds near-instantly; real providers will not, and FLUX's polling pattern could be substantially slower than any generation this platform has done so far, including text. Directly revives the timeout-class risk from Sprint 3.
- **Credential management for four separate vendors**, each with its own key-rotation and exposure surface.
- **External API volatility** — these are the most volatile dependencies this platform will have had; vendor API changes/deprecations are outside this project's control, unlike the self-hosted Ollama dependency every other AI feature currently relies on.
- **Storage growth**, compounding faster once real generations (not just test/smoke-test images) start accumulating with no retention policy (flagged as Sprint 4.1 debt, still open).

---

## Required Configuration / Environment Variables

Proposed, following `env.ts`'s existing flat, prefixed-per-concern convention:

- `IMAGE_PROVIDER` — already exists (Sprint 4.1); set to the chosen default (e.g. `openai`) once a provider is actually meant to serve real traffic.
- `OPENAI_IMAGE_API_KEY`, `OPENAI_IMAGE_MODEL`, optional `OPENAI_IMAGE_BASE_URL` override.
- `STABILITY_API_KEY`, `STABILITY_IMAGE_MODEL`.
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY` if that's the more standard name for the chosen SDK/auth path), `GEMINI_IMAGE_MODEL`.
- `FLUX_API_KEY`, `FLUX_MODEL_VERSION`, and a decision on which hosted aggregator is being used (Replicate / fal.ai / Together.ai — this is itself a choice to make when that phase starts, not assumed here).
- New, not provider-specific: something like `IMAGE_GENERATION_MAX_PER_USER_PER_DAY` (or similar) for the rate-limiting work in Architecture Readiness Review #1.

All secrets follow the existing `.env` / `deploy.sh` handling already in place for JWT secrets — no new secrets-management approach is being proposed, just more values in the same system.

---

## Dependency Changes

Default recommendation: **no new SDK dependencies** — reuse `axios` (already a dependency, and already the exact pattern `OllamaProvider` uses) for all four providers, for consistency and to avoid maintaining four different vendor SDKs' worth of type surface and upgrade cadence. Revisit only if a specific provider's raw REST API is materially awkward without its official SDK (to be evaluated per-provider when that phase starts, not decided wholesale now).

---

## API Considerations

- **Size constraints**: our `GenerateImageRequest` currently accepts arbitrary `width`/`height` (64–2048). Real providers generally don't — OpenAI, for example, offers a fixed set of size options, not arbitrary dimensions. Each provider class will need to map/validate our request against that provider's actual supported sizes, likely rounding or rejecting out-of-support values rather than passing them through blindly.
- **Format support**: not every provider supports all three formats (`png`/`jpg`/`webp`) we currently accept — needs per-provider validation too.
- **Rate limits**: each vendor has its own requests-per-minute ceiling, independent of whatever we build ourselves (Architecture Readiness Review #1) — worth knowing each provider's actual limit before load-testing anything.
- **Moderation/content-policy differences**: each vendor has a different policy and a different shape of rejection response — ties directly into the error-mapping strategy (Architecture Readiness Review #4).

---

## Estimated Implementation Phases

Mirroring Sprint 4.1's gate-per-phase approach:

- **Phase 0 — Architectural prerequisites.** Rate limiting/cost guard, timeout reconciliation decision, provider-config convention, error-mapping strategy, and deploying Sprint 4.1's already-migrated-but-undeployed code to production. This is the Sprint 3.5-shaped phase for Sprint 4.2 — a real prerequisite, not busywork.
- **Phase 1 — OpenAI Images provider.** Implementation + tests + config, initially reachable only via explicit per-request `provider: "openai"` override (not yet the default), validated against the real API with a small, controlled number of real calls.
- **Phase 2 — OpenAI as configured default + first real production validation.** An explicit go/no-go moment, since this is the first phase in the platform's history that spends real money in production.
- **Phase 3 — Stability AI provider.** Second real provider; the actual proof that the registry supports multiple live providers without touching `ImageService`.
- **Phase 4 — Gemini provider.** Third real provider; proves the config pattern generalizes to a different auth shape.
- **Phase 5 — Revisit ADR-0005 (async/background generation)**, informed by real latency data gathered from Phases 1–4, ahead of FLUX specifically.
- **Phase 6 — FLUX provider.** Async/polling pattern, implemented with whatever Phase 5 decided already in place.
- **Frontend phases** (Write/Images tab, generation form, gallery, preview, download/regenerate/save-to-project) were already scoped in the original Sprint 4.1 architecture proposal as later work and remain out of scope for this document — they'd follow once at least one real provider is live, as their own separately-approved sprint.

---

## Pointers

- Prerequisite sprint: `tasks/completed/sprint-4-1-ai-image-studio-backend.md`
- Ownership pattern this extends: `docs/architecture/decisions/ADR-0007-content-project-ownership.md`
- Single-provider precedent for text generation (contrast case): `docs/architecture/decisions/ADR-0001-single-ai-provider-no-gateway.md`
- Async generation, previously deferred, likely revisited in Phase 5 above: `docs/architecture/decisions/ADR-0005-async-generation-deferred.md`
