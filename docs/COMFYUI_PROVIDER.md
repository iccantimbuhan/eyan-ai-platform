# ComfyUI Image Provider

`ComfyUIProvider` (Sprint 4.3) is a real, self-hosted `ImageProvider` implementation that talks to a running [ComfyUI](https://github.com/comfyanonymous/ComfyUI) instance over its standard REST API. It's registered alongside `FakeImageProvider` and `GeminiImageProvider` in the same `ImageProviderFactory` registry — see [ARCHITECTURE.md](ARCHITECTURE.md#image-provider-architecture) for how the provider abstraction itself works. This document covers what's specific to ComfyUI. For installing and configuring a ComfyUI instance to point this at, see [COMFYUI_SETUP.md](COMFYUI_SETUP.md).

---

## How it works

`ImageService.generate()` calls `ComfyUIProvider.generate()` exactly like any other provider — one call in, a `Buffer` of image bytes out. Internally, that single call does four things:

1. **Load and render a workflow template.** `loadWorkflowTemplate()` reads a JSON file from `backend/resources/workflows/<COMFYUI_WORKFLOW>.json`; `renderWorkflow()` substitutes its `{{PLACEHOLDER}}` tokens with the actual request values (see [Workflow templates](#workflow-templates) below).
2. **Submit it.** `POST /prompt` with the rendered workflow graph. ComfyUI returns a `prompt_id` immediately — the workflow is now queued, not necessarily finished.
3. **Poll for completion.** `GET /history/{prompt_id}` repeatedly, every `COMFYUI_POLL_INTERVAL` ms, until either an output image appears, ComfyUI reports an error, or `COMFYUI_TIMEOUT` ms elapses.
4. **Download the result.** `GET /view?filename=...&subfolder=...&type=...` for the first output image found, across whichever node produced it.

This makes `ComfyUIProvider` the first `ImageProvider` whose own generation is asynchronous (submit now, finish later) rather than a single request/response round trip — but that's entirely contained inside the provider. `ImageService` still just awaits one `Promise`.

```
ImageService.generate()
        │
        ▼
ComfyUIProvider.generate()
        │
        ├─ loadWorkflowTemplate()  ──► resources/workflows/<name>.json
        ├─ renderWorkflow()        ──► {{PLACEHOLDER}} substitution
        ├─ POST /prompt            ──► prompt_id
        ├─ GET /history/{id}  (polling loop, bounded by COMFYUI_TIMEOUT)
        └─ GET /view                ──► image bytes
```

## Workflow templates

A workflow template is a ComfyUI **API-format** graph (`Settings → Enable Dev Mode → Save (API Format)` in the ComfyUI UI) — a JSON object keyed by node id, each with a `class_type` and `inputs`. This backend never hardcodes a node id or assumes a particular graph shape; it only:

- substitutes placeholder tokens wherever they appear, and
- scans every node's `outputs` in the `/history` response for the first one with an `images` array, to find the result.

That means **any** workflow — any set of nodes, any node ids, any custom nodes you have installed — works as long as it accepts these placeholders somewhere in its `inputs` and has exactly one image-producing output node (e.g. `SaveImage`).

### Supported placeholders

| Placeholder | Substituted with | Type after substitution |
|---|---|---|
| `{{PROMPT}}` | The request's `prompt` | string |
| `{{NEGATIVE_PROMPT}}` | The request's `negativePrompt` (empty string if none) | string |
| `{{WIDTH}}` | The request's `width` | number |
| `{{HEIGHT}}` | The request's `height` | number |
| `{{SEED}}` | A randomly generated seed (no per-request override yet) | number |
| `{{CFG}}` | A fixed default (`7.0`) | number |
| `{{STEPS}}` | A fixed default (`20`) | number |

A placeholder that is the **entire** value of a JSON field (e.g. `"seed": "{{SEED}}"`) becomes a real number if its resolved value is numeric — JSON has no other way to write "this will become a number" for a token. A placeholder embedded in a larger string (e.g. `"a photo of {{PROMPT}}, cinematic lighting"`) is always substituted as text. Node-link references like `["4", 0]` are never touched, since they contain no `{{...}}` token — see `workflow.mapper.ts` for the exact rule.

`SEED`/`CFG`/`STEPS` are ComfyUI-specific generation parameters with no equivalent in the shared `GenerateImageRequest` interface every provider implements — deliberately not added there (same reasoning already applied to Stability AI's `steps`/`cfg_scale`/`sampler` in the provider-integration backlog: provider-specific tuning knobs get sane defaults inside the provider, not in the shared contract). There is currently no way to override `SEED`/`CFG`/`STEPS` per request.

### Adding a new workflow

No backend code changes are needed to add a new workflow:

1. Build the workflow in the ComfyUI UI.
2. Export it in **API format**.
3. Wherever you want the prompt, negative prompt, dimensions, seed, cfg, or steps to come from this backend, replace that node input's value with the matching `{{PLACEHOLDER}}` (as a string, even for fields ComfyUI treats as numbers).
4. Save the file as `backend/resources/workflows/<your-name>.json`.
5. Set `COMFYUI_WORKFLOW=<your-name>` (or pass it as the new default and restart).

Two examples ship in `backend/resources/workflows/`:

- **`sdxl.json`** — a standard SDXL txt2img graph (`CheckpointLoaderSimple` → `KSampler` → `VAEDecode` → `SaveImage`), using both `{{PROMPT}}` and `{{NEGATIVE_PROMPT}}`.
- **`flux.json`** — a FLUX.1-dev graph (`UNETLoader` + `DualCLIPLoader` + `VAELoader` → `FluxGuidance` → `KSampler` → `VAEDecode` → `SaveImage`). `{{CFG}}` maps to `FluxGuidance`'s `guidance` input, not `KSampler`'s `cfg` (fixed at `1.0`, standard practice for FLUX). **`flux.json` does not use `{{NEGATIVE_PROMPT}}`** — FLUX-dev's guidance-distilled sampling doesn't support true negative-prompt conditioning the way SDXL/SD1.5 do, so this is a deliberate omission, not an oversight.

Both examples reference specific checkpoint/UNET/CLIP/VAE filenames (e.g. `sd_xl_base_1.0.safetensors`) that must exist in your own ComfyUI installation's model directories — see [COMFYUI_SETUP.md](COMFYUI_SETUP.md).

## Configuration

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `COMFYUI_URL` | Only if `IMAGE_PROVIDER=comfyui` | `http://127.0.0.1:8188` | Base URL of the ComfyUI instance |
| `COMFYUI_WORKFLOW` | Only if `IMAGE_PROVIDER=comfyui` | `sdxl` | Workflow template name (no `.json`) |
| `COMFYUI_TIMEOUT` | No | `120000` (2 min) | Overall budget, in ms, for submit + poll-until-complete |
| `COMFYUI_POLL_INTERVAL` | No | `2000` (2 sec) | Delay, in ms, between `GET /history` polls |

`IMAGE_PROVIDER=comfyui` makes ComfyUI the server-wide default; a request can also opt in per-call with `"provider": "comfyui"` regardless of the configured default (same pattern as `gemini`).

### Fail-fast startup validation

If `IMAGE_PROVIDER=comfyui`, `validateComfyUIProviderConfig()` runs at boot and throws — crashing the process with a clear message — if `COMFYUI_URL`/`COMFYUI_WORKFLOW` are empty, `COMFYUI_TIMEOUT`/`COMFYUI_POLL_INTERVAL` aren't positive numbers, or the configured workflow template doesn't exist or isn't valid JSON. This is entirely synchronous and network-free, matching this codebase's existing fail-fast conventions (`env.ts`, `validateLocalDiskStorageConfig()`, `validateGeminiProviderConfig()`).

### Health check

Whether ComfyUI is actually *reachable* is a live network question, not something that belongs in the synchronous, network-free check above. `logComfyUIHealthCheck()` runs once at boot (also only when `IMAGE_PROVIDER=comfyui`) and logs the result of `checkComfyUIHealth()` — a `GET /system_stats` reachability check — without blocking startup or crashing the process if ComfyUI happens to be down or still starting up when the backend boots. A temporarily-unreachable ComfyUI instance is a warning, logged once; only a genuinely broken configuration is fatal.

## Error handling

`ComfyUIProvider.generate()` deliberately does not catch and sanitize its own errors — it lets them propagate raw. `ImageService`'s existing stage-based error handling (Sprint 4.2 Phase 0) is what logs the detail, persists it to the generated image's owner-visible `errorMessage`, and throws the fixed, safe `ImageGenerationError` message the API actually returns. This is the same design `GeminiImageProvider` uses, and for the same reason: a provider that sanitizes its own errors would silently throw away exactly the raw detail Phase 0 was built to preserve.

Failure modes this provider distinguishes internally (all surfacing as the one safe client message, but with a distinct, specific detail logged and persisted):

- ComfyUI unreachable / network error (raw `axios`/network error message)
- Invalid workflow — ComfyUI's own validation rejected it (`node_errors` in the `POST /prompt` response)
- Timeout — no completed output within `COMFYUI_TIMEOUT`
- ComfyUI reported a generation error (`status.status_str === "error"` in `/history`)
- Completed with no output image (a workflow with no `SaveImage`-equivalent node, or one that produced nothing)
- Download failure (`GET /view` failed)

## Limitations

- **No per-request seed/cfg/steps override.** Fixed defaults (`cfg=7.0`, `steps=20`) and a random seed every time — see [Supported placeholders](#supported-placeholders).
- **Output format is derived from the returned filename's extension**, not assumed — unlike `GeminiImageProvider` (which always produces PNG), a ComfyUI workflow's `SaveImage`-equivalent node determines the actual format. Falls back to the originally-requested format only if the extension is unrecognized.
- **Single workflow at a time.** `COMFYUI_WORKFLOW` is one, server-wide (or explicit-request-provider-wide) setting — there's no per-request workflow selection yet.
- **No retry on transient failures.** A dropped connection or a single failed poll fails the whole generation; there's no automatic retry (ComfyUI's own queue durability aside).
