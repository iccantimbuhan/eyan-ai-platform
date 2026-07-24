// Shapes for Hugging Face's official Inference Providers API, "hf-inference"
// provider (Hugging Face's own first-party serverless infrastructure — see
// https://huggingface.co/docs/inference-providers/en/tasks/text-to-image).
// Deliberately not using the community @huggingface/inference SDK: this
// codebase's established convention (see GeminiImageProvider, ComfyUIClient)
// is a thin axios wrapper unless a provider's raw REST API is materially
// awkward without an SDK — text-to-image's request/response shape here is a
// single JSON POST returning raw bytes, which isn't.

export interface HuggingFaceGenerationParameters {
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface HuggingFaceTextToImageRequest {
  inputs: string;
  parameters?: HuggingFaceGenerationParameters;
}

// Returned on failure (invalid auth, unknown/ungated model, rate limit, a
// model still loading, ...). "error" is the one field Hugging Face
// documents consistently across failure modes; estimated_time only appears
// on a 503 "model is loading" response.
export interface HuggingFaceErrorResponse {
  error?: string;
  estimated_time?: number;
}

// Minimal shape of GET https://huggingface.co/api/whoami-v2 — the Hub API's
// documented token-validation endpoint. Used only for the health check
// (never for generation), since it costs nothing and doesn't touch the
// inference API at all.
export interface HuggingFaceWhoAmI {
  name?: string;
  type?: string;
}
