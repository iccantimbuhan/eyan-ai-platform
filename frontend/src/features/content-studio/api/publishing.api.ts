import { api } from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { AssetType } from '../types/asset'
import type { PublishingRecord, SchedulePublishInput } from '../types/publishing'

export const publishingApi = {
  async list(assetType: AssetType, sourceId: string): Promise<PublishingRecord[]> {
    const { data } = await api.get<ApiResponse<PublishingRecord[]>>(
      `/assets/${assetType}/${sourceId}/publishing`
    )

    return data.data
  },

  async schedule(
    assetType: AssetType,
    sourceId: string,
    payload: SchedulePublishInput
  ): Promise<PublishingRecord> {
    const { data } = await api.put<ApiResponse<PublishingRecord>>(
      `/assets/${assetType}/${sourceId}/publishing/${payload.platform}`,
      { scheduledFor: payload.scheduledFor }
    )

    return data.data
  },

  async publish(
    assetType: AssetType,
    sourceId: string,
    platform: string
  ): Promise<PublishingRecord> {
    const { data } = await api.post<ApiResponse<PublishingRecord>>(
      `/assets/${assetType}/${sourceId}/publishing/${platform}/publish`
    )

    return data.data
  },

  async retry(
    assetType: AssetType,
    sourceId: string,
    platform: string
  ): Promise<PublishingRecord> {
    const { data } = await api.post<ApiResponse<PublishingRecord>>(
      `/assets/${assetType}/${sourceId}/publishing/${platform}/retry`
    )

    return data.data
  },

  async archive(
    assetType: AssetType,
    sourceId: string,
    platform: string
  ): Promise<PublishingRecord> {
    const { data } = await api.delete<ApiResponse<PublishingRecord>>(
      `/assets/${assetType}/${sourceId}/publishing/${platform}`
    )

    return data.data
  },
}
