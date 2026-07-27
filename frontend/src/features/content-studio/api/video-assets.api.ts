import { api } from '@/services/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

import type { GenerateVideoAssetInput, VideoAsset } from '../types/video-asset'

// Same reasoning as images.api.ts's own GENERATION_TIMEOUT_MS — a
// STORYBOARD/THUMBNAIL generation goes through the identical
// ImageProviderFactory pipeline and can take just as long.
const GENERATION_TIMEOUT_MS = 300_000

export interface VideoAssetsResponse {
  items: VideoAsset[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export const videoAssetsApi = {
  async generateVideoAsset(
    payload: GenerateVideoAssetInput
  ): Promise<VideoAsset> {
    const { data } = await api.post<ApiResponse<VideoAsset>>(
      '/video-assets/generate',
      payload,
      { timeout: GENERATION_TIMEOUT_MS }
    )

    return data.data
  },

  async listVideoAssets(
    projectId: string,
    params?: { videoGroupId?: string; kind?: string }
  ): Promise<VideoAssetsResponse> {
    const { data } = await api.get<PaginatedResponse<VideoAsset>>(
      '/video-assets',
      { params: { projectId, ...params } }
    )

    return {
      items: data.data,
      pagination: data.meta,
    }
  },

  async deleteVideoAsset(id: string): Promise<void> {
    await api.delete(`/video-assets/${id}`)
  },
}
