# Hugging Face Setup

How to get an API key and configure the backend's `HuggingFaceProvider` to use it. For how the provider itself works (request/response shape, error handling, health checks), see [HUGGINGFACE_PROVIDER.md](HUGGINGFACE_PROVIDER.md).

Unlike ComfyUI, there's nothing to install or self-host here — Hugging Face's Inference Providers API is a hosted service you authenticate against with an API key.

---

## 1. Create a Hugging Face account and access token

1. Sign up (free) at <https://huggingface.co/join> if you don't already have an account.
2. Go to <https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained> to create a new **fine-grained** access token with the **"Inference Providers"** permission specifically (this pre-filled link sets that up for you).
3. Copy the token — it starts with `hf_`. Treat it like any other secret; it's billed to your account.

Some models on Hugging Face are gated (require accepting a license on the model's page before your token can use them) or Pro-only. If `HUGGINGFACE_MODEL` is one of these, generation will fail with a `403` until you accept the model's license (from its Hugging Face page) or upgrade your account — this is expected, not a bug; see [Troubleshooting](#troubleshooting).

## 2. Choose a model

`HUGGINGFACE_MODEL` accepts any text-to-image model available through Hugging Face's Inference Providers. Browse available models: <https://huggingface.co/models?pipeline_tag=text-to-image&inference_provider=all&sort=trending>.

If you don't set `HUGGINGFACE_MODEL`, it defaults to `black-forest-labs/FLUX.1-schnell` — Hugging Face's own documented example model for this API. Nothing about this provider assumes that specific model (or any specific model) is actually available to your account, or served by any one particular Inference Providers partner — see [HUGGINGFACE_PROVIDER.md](HUGGINGFACE_PROVIDER.md#model-configuration) and [Provider migration](HUGGINGFACE_PROVIDER.md#provider-migration).

## 3. Configure the backend

Add to `backend/.env`:

```bash
IMAGE_PROVIDER=huggingface       # or leave unset and pass "provider": "huggingface" per request
HUGGINGFACE_API_KEY=hf_your_token_here
HUGGINGFACE_MODEL=black-forest-labs/FLUX.1-schnell   # or any other text-to-image model on Inference Providers
HUGGINGFACE_PROVIDER=auto        # optional, "auto" is the default — pins a specific partner (e.g. "together") if set
HUGGINGFACE_TIMEOUT=60000        # 60 seconds — raise this if you see timeouts on a larger/cold model
```

See [HUGGINGFACE_PROVIDER.md#configuration](HUGGINGFACE_PROVIDER.md#configuration) for what each variable does and what happens if it's missing or invalid. If your `.env` still has `HUGGINGFACE_BASE_URL` from before the [provider migration](HUGGINGFACE_PROVIDER.md#provider-migration), it's harmlessly ignored now — remove it, or replace it with `HUGGINGFACE_PROVIDER` if you were relying on it to pin a provider.

## 4. Verify

Start the backend with `IMAGE_PROVIDER=huggingface`. Two things happen at boot:

1. **Fail-fast config validation** — the process crashes immediately with a clear error if the configuration itself is invalid (missing key/model/provider, malformed model id, non-numeric timeout). This does **not** require a network call.
2. **A one-time, non-fatal health check** — logs `[HuggingFaceProvider] Health check passed — authenticated, model "..." available.` or a specific warning (invalid key, forbidden, model not found) without generating an image or stopping the backend from starting.

Then generate an image (`POST /api/v1/images/generate` with `"provider": "huggingface"`, or as the configured default) and confirm it completes.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Backend crashes at boot with `HUGGINGFACE_API_KEY is not configured` | Required while `IMAGE_PROVIDER=huggingface` |
| Backend crashes at boot with `HUGGINGFACE_MODEL "..." is not a valid Hugging Face model id` | `HUGGINGFACE_MODEL` must be `namespace/model-name` |
| `[HuggingFaceProvider] Health check failed: ... invalid or missing API key` at boot | Token is wrong, expired, or missing the "Inference Providers" permission — regenerate it (step 1) |
| `[HuggingFaceProvider] Health check failed: ... forbidden` at boot, or a generation request returns `502` with a forbidden detail in `GET /api/v1/images/:id` | Token doesn't have access to `HUGGINGFACE_MODEL` — it may be gated (accept its license on the model's Hugging Face page) or require a paid plan |
| Health check or generation fails with a "model not found" detail | `HUGGINGFACE_MODEL` doesn't exist, is misspelled, or isn't available through the provider `HUGGINGFACE_PROVIDER` is pinned to — check the model's page for which providers currently serve it, or set `HUGGINGFACE_PROVIDER=auto` (the default) to let Hugging Face pick a live one |
| Generation fails with "could not be routed" / "No Inference Provider available for model ..." | No Inference Providers partner currently serves `HUGGINGFACE_MODEL` at all (this is the exact failure class the [provider migration](HUGGINGFACE_PROVIDER.md#provider-migration) exists to route around when *some* provider still serves it) — check the model's page, or switch to a model with active Inference Providers |
| A generation request occasionally fails mentioning "model is loading" | A cold-start 503 — the model isn't warmed up on Hugging Face's infrastructure yet. Not retried by this codebase (see [Limitations](HUGGINGFACE_PROVIDER.md#limitations)); wait 20–30 seconds and try again |
| A generation request returns `502` with "Image generation failed..." | Check the backend logs for the actual cause (`[ImageService] Provider "huggingface" failed for image ...`) — the API response is intentionally sanitized, but the owner can also see the raw reason via `GET /api/v1/images/:id` |
| Generated image is a 404 in the browser | Unrelated to Hugging Face specifically — see the production nginx gap documented in [COMFYUI_SETUP.md](COMFYUI_SETUP.md#5-production-serving-generated-images) |
