import { api } from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { GeneratedImageItem, ImageProviderOption } from '../types/image'

export interface GenerateImageRequest {
  projectId: string
  prompt: string
  provider?: Exclude<ImageProviderOption, 'auto'>
}

// Image generation can legitimately take well past the app-wide default
// timeout — same reasoning as content.api.ts's own GENERATION_TIMEOUT_MS,
// sized generously here since ComfyUI specifically polls its own backend
// to completion (see COMFYUI_TIMEOUT in backend/src/config/env.ts) rather
// than returning in a single round trip like Gemini does.
const GENERATION_TIMEOUT_MS = 300_000

// Generated images are served by Express's static middleware at this path
// (see env.storagePublicBaseUrl in backend/src/config/env.ts), which sits
// outside /api/v1 — the backend's image response only carries a relative
// storagePath, not a full URL, so this constant mirrors the backend's own
// default and must be kept in sync with it if that default ever changes.
const IMAGE_PUBLIC_BASE_PATH = '/uploads/images'

function apiOrigin(): string {
  const baseUrl = api.defaults.baseURL ?? ''
  return baseUrl.startsWith('http') ? new URL(baseUrl).origin : ''
}

export function resolveImageUrl(storagePath: string): string {
  return `${apiOrigin()}${IMAGE_PUBLIC_BASE_PATH}/${storagePath}`
}

export const imagesApi = {
  async generateImage(
    payload: GenerateImageRequest
  ): Promise<GeneratedImageItem> {
    const { projectId, prompt, provider } = payload

    const { data } = await api.post<ApiResponse<GeneratedImageItem>>(
      '/images/generate',
      {
        projectId,
        prompt,
        ...(provider ? { provider } : {}),
      },
      { timeout: GENERATION_TIMEOUT_MS }
    )

    return data.data
  },
}
