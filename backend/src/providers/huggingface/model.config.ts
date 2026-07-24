// Centralizes the default Hugging Face model and the one structural rule
// every Hugging Face model id follows ("namespace/model-name") — the only
// place either is defined, so nothing else in this provider (or elsewhere
// in the codebase) hardcodes a specific model name. HUGGINGFACE_MODEL is
// always the actual source of truth for which model gets called; this file
// only supplies its default and validates its shape.
//
// FLUX.1-schnell is Hugging Face's own documented example model for
// text-to-image via the "hf-inference" provider (see
// https://huggingface.co/docs/inference-providers/en/guides/first-api-call)
// — used as a reasonable out-of-the-box default, not a requirement. Any
// text-to-image model available through "hf-inference" works by setting
// HUGGINGFACE_MODEL; this provider never assumes a specific one is
// available on the configured account.
export const DEFAULT_HUGGINGFACE_MODEL = "black-forest-labs/FLUX.1-schnell";

// Every model on the Hugging Face Hub is identified as "<namespace>/<name>"
// (e.g. "black-forest-labs/FLUX.1-schnell", "stabilityai/stable-diffusion-3-medium-diffusers").
// This is a structural check only — it catches an empty/malformed
// HUGGINGFACE_MODEL at startup, not whether the model actually exists or is
// accessible to the configured account (that can only be known by calling
// the Hub, which is what the health check's model-lookup does instead).
const MODEL_ID_PATTERN = /^[\w.-]+\/[\w.-]+$/;

export function isValidModelId(modelId: string): boolean {
  return MODEL_ID_PATTERN.test(modelId.trim());
}
