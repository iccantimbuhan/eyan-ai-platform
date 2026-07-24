# Hugging Face Image Provider

`HuggingFaceProvider` (Sprint 4.4; client migrated to the official SDK in a follow-up fix — see [Provider migration](#provider-migration)) is a real, hosted `ImageProvider` implementation that talks to Hugging Face's official [Inference Providers API](https://huggingface.co/docs/inference-providers/en/tasks/text-to-image) via Hugging Face's own official [`@huggingface/inference`](https://www.npmjs.com/package/@huggingface/inference) SDK — never an unofficial endpoint, never a third-party wrapper. It's registered alongside `FakeImageProvider`, `GeminiImageProvider`, and `ComfyUIProvider` in the same `ImageProviderFactory` registry — see [ARCHITECTURE.md](ARCHITECTURE.md#image-provider-architecture) for how the provider abstraction itself works. This document covers what's specific to Hugging Face. For getting an API key and configuring a model, see [HUGGINGFACE_SETUP.md](HUGGINGFACE_SETUP.md).

---

## How it works

Unlike `ComfyUIProvider` (submit-then-poll), Hugging Face's text-to-image API is a single request/response round trip — much closer in shape to `GeminiImageProvider`.

```
ImageService.generate()
        │
        ▼
HuggingFaceProvider.generate()
        │
        ├─ buildRequest()                ──► { inputs, parameters }
        ├─ InferenceClient.textToImage()  ──► image Blob (SDK resolves the
        │    { model, provider: "auto" }       live Inference Providers
        │                                       partner serving the model)
        └─ mapHuggingFaceImageResponse()  ──► GenerateImageResponse
```

`HuggingFaceClient` (the generation layer) calls the official SDK's `InferenceClient.textToImage({ model, provider, inputs, parameters }, { signal })`, authenticated with `HUGGINGFACE_API_KEY`. `provider` defaults to `"auto"` (`HUGGINGFACE_PROVIDER`, see [Configuration](#configuration)) — Hugging Face's own router picks whichever live Inference Providers partner currently serves `HUGGINGFACE_MODEL`, with automatic failover, rather than this codebase assuming any single named provider (e.g. `hf-inference`) still does. `response.mapper.ts` then does two things, depending on outcome:

- **Success**: derives the actual output format from the returned Blob's `type` (Hugging Face's returned format genuinely depends on the model and the serving provider, same reasoning as `ComfyUIProvider`'s filename-extension derivation — never assumed to always be PNG the way Gemini's is).
- **Failure**: turns the SDK's own error (or, for the Hub API health-check calls, a raw HTTP failure) into one clear, Hugging-Face-aware message — see [Error handling](#error-handling) below.

## Provider migration

**Why this changed.** The original implementation (Sprint 4.4) posted directly to `https://router.huggingface.co/hf-inference/models/{model}` — the `hf-inference` provider specifically, Hugging Face's own first-party serverless infrastructure, using a hand-rolled axios client. As of July 2025, Hugging Face refocused `hf-inference` toward mostly CPU-friendly/classic models (embeddings, classification, small LLMs); `black-forest-labs/FLUX.1-schnell` (this provider's documented default model) was subsequently dropped from `hf-inference`'s catalog entirely, and generation began failing with `410 "deprecated and no longer supported by provider hf-inference"`.

This wasn't a bug in the client — Hugging Face genuinely stopped serving that model on that one provider. The model itself remained (and remains) fully available through other Inference Providers partners (Together, Fal AI, and others). But each of those partners has its **own bespoke request/response shape** on the wire (confirmed directly against Hugging Face's own `@huggingface/inference` SDK source — e.g. Together's text-to-image call is `POST https://api.together.xyz/v1/images/generations` with an entirely different payload and response envelope than `hf-inference`'s). There is no documented generic raw-REST endpoint for text-to-image across providers, unlike chat completions. Hugging Face's own current guidance is to use their official SDK with `provider: "auto"` for exactly this reason: it lets Hugging Face's router select and normalize whichever provider is actually live for the model, and keeps working automatically if that changes again.

**What changed, concretely:**

- `HuggingFaceClient.generateImage()` now calls the official `@huggingface/inference` SDK's `InferenceClient.textToImage()` instead of a raw axios `POST /models/{model}`.
- `HUGGINGFACE_PROVIDER` (new, default `"auto"`) replaces `HUGGINGFACE_BASE_URL` (removed — no longer meaningful, since which base URL is even involved is now resolved per-provider by the SDK itself, not fixed).
- `describeHuggingFaceError()` now maps the SDK's own error types (`InferenceClientProviderApiError`, `InferenceClientHubApiError`, `InferenceClientInputError`, `InferenceClientRoutingError`, `InferenceClientProviderOutputError`) in addition to the `AxiosError` path, which is still used by the unaffected Hub API health-check calls (`checkAuth()`/`checkModelAvailable()` — see [Health check](#health-check)).
- Everything else — the `ImageProvider` interface, `ImageProviderFactory` registration, `ImageService`, routes, controllers, validators, the health-check design, and the "never sanitize your own errors" pattern — is unchanged. This was deliberately scoped as a client-internals fix, not a redesign.

## Model configuration

`HUGGINGFACE_MODEL` is the only source of truth for which model gets called — nothing else in this codebase hardcodes a model name. `model.config.ts` only supplies:

- `DEFAULT_HUGGINGFACE_MODEL` — Hugging Face's own documented example model for this API (`black-forest-labs/FLUX.1-schnell`), used only as a default if `HUGGINGFACE_MODEL` is unset. Not a requirement, and not a guarantee that any single provider serves it — any text-to-image model available through Inference Providers works, and `HUGGINGFACE_PROVIDER=auto` (the default) is what lets Hugging Face route to whichever partner currently does.
- `isValidModelId()` — a structural check that a model id looks like `namespace/model-name` (every Hugging Face Hub model id follows this shape). This catches an empty or malformed `HUGGINGFACE_MODEL` at startup; it cannot and does not confirm the model actually exists or is accessible to your account — only a live call can tell you that, which is what the health check's model lookup does instead (see below).

**This provider does not assume any specific model is available.** A model that doesn't exist, isn't accessible to your account (private/gated), or has been taken down surfaces as a specific, logged 403/404 (see [Error handling](#error-handling)) — never a crash, never a silent fallback to a different model.

### Generation parameters

| Field | Source | Notes |
|---|---|---|
| `inputs` (prompt) | `GenerateImageRequest.prompt` | required |
| `parameters.negative_prompt` | `GenerateImageRequest.negativePrompt` | sent whenever provided — Hugging Face documents this as a standard parameter, widely supported across diffusers-based models (unlike Gemini, which has no equivalent at all). A model that doesn't use it simply ignores the field. |
| `parameters.width` / `parameters.height` | `GenerateImageRequest.width` / `.height` | sent as-is; no rounding or aspect-ratio snapping (unlike Gemini) |
| `parameters.seed` | generated internally, randomly, per request | `GenerateImageRequest` has no seed field — see [Limitations](#limitations) |

`num_inference_steps`/`guidance_scale`/`scheduler` (also documented by Hugging Face) are intentionally not sent — no fixed default is imposed; each model's own defaults apply. Add them the same way `width`/`height` are wired if a future need arises.

## Configuration

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `HUGGINGFACE_API_KEY` | Only if `IMAGE_PROVIDER=huggingface` | — | A Hugging Face access token with "Inference Providers" permission |
| `HUGGINGFACE_MODEL` | No | `black-forest-labs/FLUX.1-schnell` | Model id, `namespace/model-name` |
| `HUGGINGFACE_PROVIDER` | No | `auto` | Which Inference Providers partner serves the request. `auto` (recommended) lets Hugging Face's router pick whichever live provider currently serves `HUGGINGFACE_MODEL`, with automatic failover. Set to a specific provider name (e.g. `together`, `fal-ai`, `hf-inference`) to pin it. |
| `HUGGINGFACE_TIMEOUT` | No | `60000` (60s) | Single HTTP call timeout, in ms — generation is one request/response round trip, so there's no separate "overall budget" the way `ComfyUIProvider` needs one |

> `HUGGINGFACE_BASE_URL` (used by the pre-migration client) is no longer read — see [Provider migration](#provider-migration). If it's still set in an existing `.env`, it's silently ignored; remove it or replace it with `HUGGINGFACE_PROVIDER`.

`IMAGE_PROVIDER=huggingface` makes it the server-wide default; a request can also opt in per-call with `"provider": "huggingface"` regardless of the configured default.

### Fail-fast startup validation

If `IMAGE_PROVIDER=huggingface`, `validateHuggingFaceProviderConfig()` runs at boot and throws — crashing the process with a clear message — if `HUGGINGFACE_API_KEY`/`HUGGINGFACE_MODEL`/`HUGGINGFACE_PROVIDER` are empty, `HUGGINGFACE_MODEL` isn't a well-formed model id, or `HUGGINGFACE_TIMEOUT` isn't a positive number. Entirely synchronous and network-free, matching this codebase's existing fail-fast conventions.

### Health check

`checkHuggingFaceHealth()` runs once at boot (only when `IMAGE_PROVIDER=huggingface`) and checks, in order: configuration validity (the same sync check above), then authentication (`GET https://huggingface.co/api/whoami-v2` — the Hub API's documented token-validation endpoint), then model availability (`GET https://huggingface.co/api/models/{model}` — confirms the model exists and is accessible to this token). **Neither network call touches the inference API or generates an image** — both are free Hub metadata lookups, satisfying the explicit "health checks must not generate images" requirement. Like `ComfyUIProvider`'s health check, a failure here only logs a warning and lets the server keep starting; only a genuinely invalid configuration is fatal.

**Known gap:** the model-availability check confirms the model exists and is visible to this token on the Hub — it does not confirm that any specific Inference Providers partner currently serves it for text-to-image (that's exactly the class of failure this provider migrated to fix; see [Provider migration](#provider-migration)). Under `HUGGINGFACE_PROVIDER=auto`, a model with zero live providers only surfaces at actual generation time, as a routing failure (see [Error handling](#error-handling)).

## Error handling

`HuggingFaceProvider.generate()` deliberately does not sanitize its own errors before throwing — `describeHuggingFaceError()` (in `response.mapper.ts`) turns the raw HTTP failure into one clear, specific message, which is *still* thrown as a plain, unsanitized `Error`. `ImageService`'s existing stage-based error handling (Sprint 4.2 Phase 0) is what logs that message, persists it to the generated image's owner-visible `errorMessage`, and throws the one fixed, safe `ImageGenerationError` the API client actually sees. Same design as `GeminiImageProvider` and `ComfyUIProvider`, for the same reason: a provider that pre-sanitizes its own errors would silently discard exactly the raw detail Phase 0 was built to preserve.

Failure modes distinguished internally (each producing the one safe client message, but a distinct, specific detail logged and persisted). Generation errors come from the `@huggingface/inference` SDK; health-check errors (`checkAuth()`/`checkModelAvailable()`) still come from axios — `describeHuggingFaceError()` handles both:

| Source | Case | Meaning | Logged detail includes |
|---|---|---|---|
| SDK: `InferenceClientProviderApiError` | HTTP 401/403/404/429/503/other from the resolved provider | Same meanings as before (invalid key / forbidden / model not found via the selected provider / rate limited / model loading / generic) | The provider's own error text; `estimated_time` on 503 when present |
| SDK: `InferenceClientHubApiError` | Hugging Face's Hub API rejected the request while resolving which provider serves the model | 401/403 map the same as above; anything else means the model has no live provider mapping at all | The SDK's own routing message |
| SDK: `InferenceClientInputError` / `InferenceClientRoutingError` | No provider currently serves `HUGGINGFACE_MODEL` under `HUGGINGFACE_PROVIDER`, or a client-side routing precondition failed | Root cause matching the Sprint 4.4→migration incident: a configured model with no live provider | The SDK's own message (already safe, not raw HTTP detail) |
| SDK: `InferenceClientProviderOutputError` | The resolved provider returned a response the SDK couldn't parse as an image | Malformed upstream response | The SDK's own message |
| SDK/native `fetch` | Timeout (`AbortSignal.timeout`) vs. other network failure — distinguished | Request exceeded `HUGGINGFACE_TIMEOUT`, or a connection-level failure | The underlying error message |
| axios (health check only) | Same status/timeout/network distinctions as before | Hub API auth/model-lookup failures | The underlying axios/network error message |

Hugging Face's raw error responses are never forwarded to the API client — only ever logged and persisted to the owner-visible `errorMessage`.

## Limitations

- **No per-request seed override.** A random seed is generated internally on every request — same reasoning and same pattern as `ComfyUIProvider`'s `cfg`/`steps` (provider-specific tuning knobs live inside the provider, not the shared `GenerateImageRequest` contract every provider implements).
- **No automatic retry on a 503 "model loading" response** written explicitly into this codebase — a cold model surfaces as a normal, sanitized failure rather than being retried by our own code. (The SDK itself defaults to retrying once on a provider 503; see `retry_on_error` in `@huggingface/inference`'s `Options` type. This is an SDK default, not something this codebase configures.)
- **`num_inference_steps`/`guidance_scale`/`scheduler` aren't exposed.** Each model's own defaults apply; not wired up in this sprint (see Generation parameters above).
- **Output dimensions aren't validated or snapped** to whatever step size a given model actually supports (e.g. multiples of 8) — sent as requested; an unsupported size is the model/provider's own 4xx to surface, not something this backend pre-validates.
- **`HUGGINGFACE_PROVIDER=auto` doesn't guarantee a specific provider, or even that generation succeeds** — only that Hugging Face's router will try. If `HUGGINGFACE_MODEL` has zero live Inference Providers partners, generation fails with a routing error (see [Error handling](#error-handling)) — there is no local fallback list.

## Adding another Hugging Face model

No code change is needed — set `HUGGINGFACE_MODEL` to any text-to-image model id available through Inference Providers (browse them [here](https://huggingface.co/models?pipeline_tag=text-to-image&inference_provider=all&sort=trending)) and restart. `HUGGINGFACE_PROVIDER=auto` (the default) works for any of them without further configuration. If the model requires a different set of parameters than what's currently wired up (see Generation parameters), extend `buildRequest()` in `huggingface.provider.ts` the same way `width`/`height` are already wired — this file is the one and only place request-shape decisions are made for this provider.
