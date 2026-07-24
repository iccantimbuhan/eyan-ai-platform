// "auto" means: no provider override sent to the backend, so ImageService
// falls back to whatever IMAGE_PROVIDER is configured server-side (see
// backend/src/config/env.ts). "gemini"/"comfyui"/"huggingface"/"fake" are
// explicit per-request overrides — all four are already-registered
// ImageProviders (see backend/src/providers/register-image-providers.ts);
// this list is not meant to enumerate every registered provider
// automatically, since a new backend provider shouldn't silently change
// this UI without a deliberate decision to surface it. "fake" is included
// deliberately (Sprint 4.4) — a free, zero-cost, always-available way to
// exercise the generation flow without a real provider configured.
export type ImageProviderOption =
  'auto' | 'gemini' | 'comfyui' | 'huggingface' | 'fake'

export const IMAGE_PROVIDER_OPTIONS: {
  value: ImageProviderOption
  label: string
}[] = [
  { value: 'auto', label: 'Auto (server default)' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'comfyui', label: 'ComfyUI' },
  { value: 'huggingface', label: 'Hugging Face' },
  { value: 'fake', label: 'Fake (testing)' },
]

export type GeneratedImageStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface GeneratedImageItem {
  id: string
  projectId: string
  prompt: string
  negativePrompt: string | null
  provider: string
  model: string | null
  width: number
  height: number
  format: string
  storagePath: string | null
  thumbnailPath: string | null
  status: GeneratedImageStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
