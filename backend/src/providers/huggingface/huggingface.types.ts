// Request/response shapes for Hugging Face's official Inference Providers
// API (see https://huggingface.co/docs/inference-providers/en/tasks/text-to-image).
// Generation itself goes through Hugging Face's own official
// @huggingface/inference SDK rather than a hand-rolled axios call — each
// Inference Providers partner (hf-inference, together, fal-ai, ...) has its
// own request/response shape on the wire, and the SDK is what Hugging Face
// itself keeps in sync with that catalog. These types describe the stable,
// provider-agnostic shape this codebase passes to and receives from the SDK.

export interface HuggingFaceGenerationParameters {
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  // The SDK's own TextToImageParameters type carries an index signature
  // (it's generated from Hugging Face's task JSON schema, which allows
  // arbitrary additional provider-specific fields) — matched here so this
  // type stays structurally assignable to it without widening to `any`.
  [key: string]: unknown;
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
