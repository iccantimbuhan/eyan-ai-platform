# Hugging Face Image Provider

`HuggingFaceProvider` (Sprint 4.4) is a real, hosted `ImageProvider` implementation that talks to Hugging Face's official [Inference Providers API](https://huggingface.co/docs/inference-providers/en/tasks/text-to-image) — specifically the `hf-inference` provider, Hugging Face's own first-party serverless infrastructure (as opposed to a third-party-routed provider like `fal-ai`/`replicate`/`together`, or an unofficial/scraped endpoint). It's registered alongside `FakeImageProvider`, `GeminiImageProvider`, and `ComfyUIProvider` in the same `ImageProviderFactory` registry — see [ARCHITECTURE.md](ARCHITECTURE.md#image-provider-architecture) for how the provider abstraction itself works. This document covers what's specific to Hugging Face. For getting an API key and configuring a model, see [HUGGINGFACE_SETUP.md](HUGGINGFACE_SETUP.md).

---

## How it works

Unlike `ComfyUIProvider` (submit-then-poll), Hugging Face's text-to-image API is a single request/response round trip — much closer in shape to `GeminiImageProvider`.

```
ImageService.generate()
        │
        ▼
HuggingFaceProvider.generate()
        │
        ├─ buildRequest()               ──► { inputs, parameters }
        ├─ POST /models/{HUGGINGFACE_MODEL}  ──► raw image bytes + Content-Type
        └─ mapHuggingFaceImageResponse() ──► GenerateImageResponse
```

`HuggingFaceClient` (the HTTP layer) posts to `{HUGGINGFACE_BASE_URL}/models/{model}` with `Authorization: Bearer {HUGGINGFACE_API_KEY}` and a JSON body of `{ inputs: prompt, parameters: { negative_prompt, width, height, seed } }`, requesting the response as raw bytes (`responseType: "arraybuffer"`). `response.mapper.ts` then does two things, depending on outcome:

- **Success**: derives the actual output format from the response's `Content-Type` header (Hugging Face's returned format genuinely depends on the model, same reasoning as `ComfyUIProvider`'s filename-extension derivation — never assumed to always be PNG the way Gemini's is).
- **Failure**: turns the raw HTTP failure into one clear, Hugging-Face-aware message — see [Error handling](#error-handling) below.

## Model configuration

`HUGGINGFACE_MODEL` is the only source of truth for which model gets called — nothing else in this codebase hardcodes a model name. `model.config.ts` only supplies:

- `DEFAULT_HUGGINGFACE_MODEL` — Hugging Face's own documented example model for this API (`black-forest-labs/FLUX.1-schnell`), used only as a default if `HUGGINGFACE_MODEL` is unset. Not a requirement — any text-to-image model available through `hf-inference` works.
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
| `HUGGINGFACE_BASE_URL` | No | `https://router.huggingface.co/hf-inference` | Inference Providers API base URL (the `hf-inference` provider specifically) |
| `HUGGINGFACE_TIMEOUT` | No | `60000` (60s) | Single HTTP call timeout, in ms — generation is one request/response round trip, so there's no separate "overall budget" the way `ComfyUIProvider` needs one |

`IMAGE_PROVIDER=huggingface` makes it the server-wide default; a request can also opt in per-call with `"provider": "huggingface"` regardless of the configured default.

### Fail-fast startup validation

If `IMAGE_PROVIDER=huggingface`, `validateHuggingFaceProviderConfig()` runs at boot and throws — crashing the process with a clear message — if `HUGGINGFACE_API_KEY`/`HUGGINGFACE_MODEL`/`HUGGINGFACE_BASE_URL` are empty, `HUGGINGFACE_MODEL` isn't a well-formed model id, or `HUGGINGFACE_TIMEOUT` isn't a positive number. Entirely synchronous and network-free, matching this codebase's existing fail-fast conventions.

### Health check

`checkHuggingFaceHealth()` runs once at boot (only when `IMAGE_PROVIDER=huggingface`) and checks, in order: configuration validity (the same sync check above), then authentication (`GET https://huggingface.co/api/whoami-v2` — the Hub API's documented token-validation endpoint), then model availability (`GET https://huggingface.co/api/models/{model}` — confirms the model exists and is accessible to this token). **Neither network call touches the inference API or generates an image** — both are free Hub metadata lookups, satisfying the explicit "health checks must not generate images" requirement. Like `ComfyUIProvider`'s health check, a failure here only logs a warning and lets the server keep starting; only a genuinely invalid configuration is fatal.

## Error handling

`HuggingFaceProvider.generate()` deliberately does not sanitize its own errors before throwing — `describeHuggingFaceError()` (in `response.mapper.ts`) turns the raw HTTP failure into one clear, specific message, which is *still* thrown as a plain, unsanitized `Error`. `ImageService`'s existing stage-based error handling (Sprint 4.2 Phase 0) is what logs that message, persists it to the generated image's owner-visible `errorMessage`, and throws the one fixed, safe `ImageGenerationError` the API client actually sees. Same design as `GeminiImageProvider` and `ComfyUIProvider`, for the same reason: a provider that pre-sanitizes its own errors would silently discard exactly the raw detail Phase 0 was built to preserve.

Failure modes distinguished internally (each producing the one safe client message, but a distinct, specific detail logged and persisted):

| HTTP status | Meaning | Logged detail includes |
|---|---|---|
| 401 | Invalid or missing API key | Hugging Face's own error text |
| 403 | Forbidden — token lacks permission for this model (private/gated model, no subscription, etc.) | Hugging Face's own error text |
| 404 | Model not found or unsupported via the configured provider | Hugging Face's own error text |
| 429 | Rate limit exceeded | Hugging Face's own error text |
| 503 | Model is loading (cold start) | Hugging Face's `estimated_time`, when present |
| other | Generic status-code failure | Hugging Face's own error text |
| (none) | Timeout (`ECONNABORTED`) vs. other network failure — distinguished | The underlying axios/network error message |

Hugging Face's raw error responses are never forwarded to the API client — only ever logged and persisted to the owner-visible `errorMessage`.

## Limitations

- **No per-request seed override.** A random seed is generated internally on every request — same reasoning and same pattern as `ComfyUIProvider`'s `cfg`/`steps` (provider-specific tuning knobs live inside the provider, not the shared `GenerateImageRequest` contract every provider implements).
- **No automatic retry on a 503 "model loading" response.** A cold model surfaces as a normal, sanitized failure rather than being silently retried — if you see this, retry the request yourself after 20–30 seconds.
- **`num_inference_steps`/`guidance_scale`/`scheduler` aren't exposed.** Each model's own defaults apply; not wired up in this sprint (see Generation parameters above).
- **Output dimensions aren't validated or snapped** to whatever step size a given model actually supports (e.g. multiples of 8) — sent as requested; an unsupported size is the model/provider's own 4xx to surface, not something this backend pre-validates.

## Adding another Hugging Face model

No code change is needed — set `HUGGINGFACE_MODEL` to any text-to-image model id available through the `hf-inference` provider (browse them [here](https://huggingface.co/models?inference_provider=hf-inference&pipeline_tag=text-to-image)) and restart. If the model requires a different set of parameters than what's currently wired up (see Generation parameters), extend `buildRequest()` in `huggingface.provider.ts` the same way `width`/`height` are already wired — this file is the one and only place request-shape decisions are made for this provider.
