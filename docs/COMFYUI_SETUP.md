# ComfyUI Setup

How to install and configure a ComfyUI instance for this platform's `ComfyUIProvider` to use. For how the provider itself works (workflow templates, error handling, health checks), see [COMFYUI_PROVIDER.md](COMFYUI_PROVIDER.md).

---

## 1. Install ComfyUI

ComfyUI is not bundled with this repository — it's a separate, self-hosted service you run yourself (locally, on the same VPS, or anywhere reachable over HTTP from the backend).

Follow ComfyUI's own installation instructions: <https://github.com/comfyanonymous/ComfyUI>. In short:

```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt
python main.py --listen 127.0.0.1 --port 8188
```

`--listen 127.0.0.1` keeps ComfyUI reachable only from the same machine as the backend, which is the expected deployment shape (the backend calls ComfyUI's REST API server-to-server; nothing about this integration requires or expects ComfyUI to be reachable from the public internet).

This platform's VPS has no GPU (see `docs/architecture/decisions/ADR-0001-single-ai-provider-no-gateway.md`), so if you're running ComfyUI on the same production host, expect CPU-only generation to be slow — size `COMFYUI_TIMEOUT` accordingly (see below), or point `COMFYUI_URL` at a separate GPU-equipped machine instead.

## 2. Install the models your workflow needs

Neither `sdxl.json` nor `flux.json` (the two example workflows in `backend/resources/workflows/`) will run until the checkpoint/model files they reference exist in your ComfyUI installation:

- **`sdxl.json`** needs `sd_xl_base_1.0.safetensors` in `ComfyUI/models/checkpoints/`.
- **`flux.json`** needs `flux1-dev.safetensors` in `ComfyUI/models/unet/`, `t5xxl_fp16.safetensors` and `clip_l.safetensors` in `ComfyUI/models/clip/`, and `ae.safetensors` in `ComfyUI/models/vae/`.

If you're using different models, either download the ones referenced above or edit the workflow JSON's `ckpt_name`/`unet_name`/`clip_name*`/`vae_name` fields to match what you actually have installed — these are plain values, not placeholders, so editing them directly is expected. Model availability is entirely your ComfyUI installation's responsibility; this backend has no way to verify a referenced model file exists ahead of submitting the workflow.

## 3. Configure the backend

Add to `backend/.env`:

```bash
IMAGE_PROVIDER=comfyui        # or leave unset and pass "provider": "comfyui" per request
COMFYUI_URL=http://127.0.0.1:8188
COMFYUI_WORKFLOW=sdxl         # or "flux", or your own template's filename (without .json)
COMFYUI_TIMEOUT=120000        # 2 minutes — raise this for CPU-only or larger workflows
COMFYUI_POLL_INTERVAL=2000    # 2 seconds
```

See [COMFYUI_PROVIDER.md](COMFYUI_PROVIDER.md#configuration) for what each variable does and what happens if it's missing or invalid.

## 4. Verify

Start ComfyUI, then start the backend. Two things happen at boot if `IMAGE_PROVIDER=comfyui`:

1. **Fail-fast config validation** — the process crashes immediately with a clear error if the configuration itself is invalid (bad URL, missing workflow file, non-numeric timeout/poll interval). This does **not** require ComfyUI to actually be running.
2. **A one-time, non-fatal health check** — logs either `[ComfyUIProvider] Health check passed — reachable at ...` or a warning if ComfyUI isn't reachable yet. A failed health check does not stop the backend from starting (see [COMFYUI_PROVIDER.md](COMFYUI_PROVIDER.md#health-check) for why).

Then generate an image (`POST /api/v1/images/generate` with `"provider": "comfyui"`, or as the configured default) and confirm it completes.

## 5. Production: serving generated images

Generated images (from **any** provider, not ComfyUI-specific) are saved to disk by `LocalDiskStorageProvider` and served by the backend's own Express server at `env.storagePublicBaseUrl` (default `/uploads/images`) — added in Sprint 4.3 alongside this provider, since nothing before Sprint 4.3 actually needed to load a generated image over HTTP.

**This repository's production nginx config (`/etc/nginx/sites-available/eyan.fyi`) does not yet proxy `/uploads/` to the backend** — it only proxies `/api/`. Until that's added, generated images won't load in production even though the backend itself now serves them correctly. This is a manual, sudo-gated infrastructure change outside this repository's version control, so it hasn't been applied automatically. To fix it, add a block like this to the existing `server { }` in `/etc/nginx/sites-available/eyan.fyi`, alongside the existing `location /api/ { ... }` block:

```nginx
location /uploads/ {
    proxy_pass http://127.0.0.1:3001/uploads/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Then validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Local development is unaffected — the frontend resolves image URLs against the backend's origin directly when `VITE_API_URL` is an absolute URL, or as same-origin root-relative paths otherwise (see `resolveImageUrl()` in `frontend/src/features/content-studio/api/images.api.ts`).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Backend crashes at boot with `COMFYUI_URL is not configured` / `COMFYUI_WORKFLOW is not configured` | Required env var missing while `IMAGE_PROVIDER=comfyui` |
| Backend crashes at boot with `ComfyUI workflow template "..." was not found` | `COMFYUI_WORKFLOW` doesn't match a file in `backend/resources/workflows/` |
| `[ComfyUIProvider] Health check failed: connect ECONNREFUSED` at boot | ComfyUI isn't running yet, or `COMFYUI_URL` is wrong — the backend still starts; fix and generation will work once ComfyUI is reachable |
| A generation request returns `502` with "Image generation failed..." | Check the backend logs for the actual cause (`[ImageService] Provider "comfyui" failed for image ...`) — the API response is intentionally sanitized, but the owner can also see the raw reason via `GET /api/v1/images/:id` |
| Generation always times out | `COMFYUI_TIMEOUT` too low for your hardware/workflow, or the workflow references a missing model and never completes — check ComfyUI's own logs/queue |
| Generated image is a 404 in the browser | Production nginx gap — see [Serving generated images](#5-production-serving-generated-images) above |
