import { api } from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { AssetType } from '../types/asset'
import type {
  AssetAssignment,
  AssetComment,
  AssetReviewEvent,
  AssignReviewerInput,
  CreateAssetCommentInput,
} from '../types/review-workspace'

export const reviewWorkspaceApi = {
  async listComments(assetType: AssetType, sourceId: string): Promise<AssetComment[]> {
    const { data } = await api.get<ApiResponse<AssetComment[]>>(
      `/assets/${assetType}/${sourceId}/comments`
    )

    return data.data
  },

  async createComment(
    assetType: AssetType,
    sourceId: string,
    payload: CreateAssetCommentInput
  ): Promise<AssetComment> {
    const { data } = await api.post<ApiResponse<AssetComment>>(
      `/assets/${assetType}/${sourceId}/comments`,
      payload
    )

    return data.data
  },

  async resolveComment(
    assetType: AssetType,
    sourceId: string,
    commentId: string
  ): Promise<AssetComment> {
    const { data } = await api.patch<ApiResponse<AssetComment>>(
      `/assets/${assetType}/${sourceId}/comments/${commentId}/resolve`
    )

    return data.data
  },

  async deleteComment(
    assetType: AssetType,
    sourceId: string,
    commentId: string
  ): Promise<void> {
    await api.delete(`/assets/${assetType}/${sourceId}/comments/${commentId}`)
  },

  async assignReviewer(
    assetType: AssetType,
    sourceId: string,
    payload: AssignReviewerInput
  ): Promise<AssetAssignment> {
    const { data } = await api.put<ApiResponse<AssetAssignment>>(
      `/assets/${assetType}/${sourceId}/assignment`,
      payload
    )

    return data.data
  },

  async unassignReviewer(assetType: AssetType, sourceId: string): Promise<void> {
    await api.delete(`/assets/${assetType}/${sourceId}/assignment`)
  },

  async getTimeline(assetType: AssetType, sourceId: string): Promise<AssetReviewEvent[]> {
    const { data } = await api.get<ApiResponse<AssetReviewEvent[]>>(
      `/assets/${assetType}/${sourceId}/timeline`
    )

    return data.data
  },
}
