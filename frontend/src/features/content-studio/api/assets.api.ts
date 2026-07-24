import { api } from '@/services/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  AssetDetail,
  AssetSummary,
  AssetType,
  AssetVersionSummary,
  BatchAssetAction,
  BatchAssetActionResult,
  BatchAssetItemRef,
  ListAssetsParams,
  ReviewAssetInput,
} from '../types/asset'

export interface AssetsResponse {
  items: AssetSummary[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// regenerate/duplicate both trigger real generation under the hood for
// content/image assets — same reasoning and same budget as
// content.api.ts/images.api.ts's own GENERATION_TIMEOUT_MS constants.
const GENERATION_TIMEOUT_MS = 300_000

export const assetsApi = {
  async listAssets(
    projectId: string,
    params?: ListAssetsParams
  ): Promise<AssetsResponse> {
    const { data } = await api.get<PaginatedResponse<AssetSummary>>(
      '/assets',
      { params: { projectId, ...params } }
    )

    return { items: data.data, pagination: data.meta }
  },

  async getAsset(assetType: AssetType, sourceId: string): Promise<AssetDetail> {
    const { data } = await api.get<ApiResponse<AssetDetail>>(
      `/assets/${assetType}/${sourceId}`
    )

    return data.data
  },

  async reviewAsset(
    assetType: AssetType,
    sourceId: string,
    payload: ReviewAssetInput
  ): Promise<AssetDetail> {
    const { data } = await api.patch<ApiResponse<AssetDetail>>(
      `/assets/${assetType}/${sourceId}/review`,
      payload
    )

    return data.data
  },

  async regenerateAsset(
    assetType: AssetType,
    sourceId: string
  ): Promise<AssetDetail> {
    const { data } = await api.post<ApiResponse<AssetDetail>>(
      `/assets/${assetType}/${sourceId}/regenerate`,
      {},
      { timeout: GENERATION_TIMEOUT_MS }
    )

    return data.data
  },

  async duplicateAsset(
    assetType: AssetType,
    sourceId: string
  ): Promise<AssetDetail> {
    const { data } = await api.post<ApiResponse<AssetDetail>>(
      `/assets/${assetType}/${sourceId}/duplicate`,
      {},
      { timeout: GENERATION_TIMEOUT_MS }
    )

    return data.data
  },

  async deleteAsset(assetType: AssetType, sourceId: string): Promise<void> {
    await api.delete(`/assets/${assetType}/${sourceId}`)
  },

  async getAssetVersions(
    assetType: AssetType,
    sourceId: string
  ): Promise<AssetVersionSummary[]> {
    const { data } = await api.get<ApiResponse<AssetVersionSummary[]>>(
      `/assets/${assetType}/${sourceId}/versions`
    )

    return data.data
  },

  async batchAssetAction(
    items: BatchAssetItemRef[],
    action: BatchAssetAction
  ): Promise<BatchAssetActionResult[]> {
    const { data } = await api.post<ApiResponse<BatchAssetActionResult[]>>(
      '/assets/batch',
      { items, action }
    )

    return data.data
  },
}
