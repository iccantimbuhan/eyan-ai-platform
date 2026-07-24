// "auto" means: no provider override sent to the backend, so ImageService
// falls back to whatever IMAGE_PROVIDER is configured server-side (see
// backend/src/config/env.ts). "gemini" and "comfyui" are explicit
// per-request overrides — both are already-registered ImageProviders (see
// backend/src/providers/register-image-providers.ts); this list is not
// meant to enumerate every registered provider automatically, since a new
// backend provider shouldn't silently change this UI without a deliberate
// decision to surface it.
export type ImageProviderOption = 'auto' | 'gemini' | 'comfyui'

export const IMAGE_PROVIDER_OPTIONS: {
  value: ImageProviderOption
  label: string
}[] = [
  { value: 'auto', label: 'Auto (server default)' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'comfyui', label: 'ComfyUI' },
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
