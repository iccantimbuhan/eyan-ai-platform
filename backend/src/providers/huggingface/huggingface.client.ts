import axios, { type AxiosInstance } from "axios";
import type {
  HuggingFaceTextToImageRequest,
  HuggingFaceWhoAmI,
} from "./huggingface.types.js";

// Hub API (account/model metadata) lives on a fixed host, distinct from the
// configurable inference base URL (HUGGINGFACE_BASE_URL) — it's Hugging
// Face's general Hub API, not part of the Inference Providers surface, and
// used only for the health check (see checkAuth()/checkModelAvailable()
// below), never for generation.
const HUB_API_BASE_URL = "https://huggingface.co/api";

// Health-check calls should return quickly regardless of how generous
// HUGGINGFACE_TIMEOUT is (that budget is for actual generation) — capped
// separately so a slow/unreachable Hub API can't make startup logging hang.
const HEALTH_CHECK_TIMEOUT_MS = 10_000;

export interface GeneratedImageBytes {
  buffer: Buffer;
  contentType: string;
}

// Thin wrapper over Hugging Face's official Inference Providers API
// ("hf-inference" provider — Hugging Face's own first-party serverless
// infrastructure) and the subset of the Hub API needed for a no-generation
// health check. No retry logic here, matching ComfyUIClient's precedent —
// HuggingFaceProvider owns how a failure is interpreted and surfaced.
export class HuggingFaceClient {
  private readonly inference: AxiosInstance;
  private readonly hub: AxiosInstance;

  constructor(baseURL: string, apiKey: string, timeoutMs: number) {
    const headers = { Authorization: `Bearer ${apiKey}` };

    this.inference = axios.create({ baseURL, timeout: timeoutMs, headers });
    this.hub = axios.create({
      baseURL: HUB_API_BASE_URL,
      timeout: HEALTH_CHECK_TIMEOUT_MS,
      headers,
    });
  }

  async generateImage(
    model: string,
    request: HuggingFaceTextToImageRequest
  ): Promise<GeneratedImageBytes> {
    const response = await this.inference.post(`/models/${model}`, request, {
      responseType: "arraybuffer",
    });

    return {
      buffer: Buffer.from(response.data as ArrayBuffer),
      contentType: String(response.headers["content-type"] ?? ""),
    };
  }

  // GET /api/whoami-v2 is the Hub API's documented way to validate a token
  // without touching inference at all — no image is generated, no
  // generation cost is incurred.
  async checkAuth(): Promise<HuggingFaceWhoAmI> {
    const response = await this.hub.get<HuggingFaceWhoAmI>("/whoami-v2");
    return response.data;
  }

  // GET /api/models/{id} confirms the configured model exists and is
  // accessible to this token (private/gated models 404 or 403 for a token
  // without access) — again, Hub metadata only, never inference.
  async checkModelAvailable(model: string): Promise<void> {
    await this.hub.get(`/models/${model}`);
  }
}
