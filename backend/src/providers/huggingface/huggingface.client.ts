import axios, { type AxiosInstance } from "axios";
import { InferenceClient, type InferenceProviderOrPolicy } from "@huggingface/inference";
import type {
  HuggingFaceTextToImageRequest,
  HuggingFaceWhoAmI,
} from "./huggingface.types.js";

// Hub API (account/model metadata) lives on a fixed host, distinct from
// wherever the Inference Providers router ultimately sends a generation
// request — it's Hugging Face's general Hub API, not part of the Inference
// Providers surface, and used only for the health check (see
// checkAuth()/checkModelAvailable() below), never for generation.
const HUB_API_BASE_URL = "https://huggingface.co/api";

// Health-check calls should return quickly regardless of how generous
// HUGGINGFACE_TIMEOUT is (that budget is for actual generation) — capped
// separately so a slow/unreachable Hub API can't make startup logging hang.
const HEALTH_CHECK_TIMEOUT_MS = 10_000;

export interface GeneratedImageBytes {
  buffer: Buffer;
  contentType: string;
}

// Generation goes through Hugging Face's official @huggingface/inference SDK
// (not a raw REST call — see the class comment on HuggingFaceProvider for
// why). The SDK's job is exactly the part a hand-rolled client can't safely
// replicate: each Inference Providers partner (hf-inference, together,
// fal-ai, ...) has its own request/response shape, and the SDK is what
// Hugging Face itself updates as that catalog changes. Health checks stay on
// a plain axios client against the Hub API — that surface is stable, free,
// and unrelated to which inference provider ends up serving a generation.
export class HuggingFaceClient {
  private readonly inference: InferenceClient;
  private readonly hub: AxiosInstance;
  private readonly provider: string;
  private readonly timeoutMs: number;

  constructor(apiKey: string, timeoutMs: number, provider: string) {
    this.inference = new InferenceClient(apiKey);
    this.hub = axios.create({
      baseURL: HUB_API_BASE_URL,
      timeout: HEALTH_CHECK_TIMEOUT_MS,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    this.provider = provider;
    this.timeoutMs = timeoutMs;
  }

  async generateImage(
    model: string,
    request: HuggingFaceTextToImageRequest
  ): Promise<GeneratedImageBytes> {
    const blob = await this.inference.textToImage(
      {
        model,
        // HUGGINGFACE_PROVIDER is a free-form env string (validated only for
        // non-emptiness — see validateHuggingFaceProviderConfig()), not
        // narrowed to the SDK's own provider-name union at compile time; an
        // unrecognized value is the SDK/router's own runtime error to raise,
        // the same way an invalid HUGGINGFACE_MODEL is the Hub's to raise.
        provider: this.provider as InferenceProviderOrPolicy,
        inputs: request.inputs,
        parameters: request.parameters,
      },
      { signal: AbortSignal.timeout(this.timeoutMs) }
    );

    return {
      buffer: Buffer.from(await blob.arrayBuffer()),
      contentType: blob.type,
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
  // without access) — again, Hub metadata only, never inference. It does not
  // confirm that any specific Inference Providers partner currently serves
  // the model for text-to-image; under provider "auto" that can only be
  // known at generation time, since Hugging Face's own provider catalog per
  // model can change (see docs/HUGGINGFACE_PROVIDER.md).
  async checkModelAvailable(model: string): Promise<void> {
    await this.hub.get(`/models/${model}`);
  }
}
