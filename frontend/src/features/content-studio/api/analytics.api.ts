import { api } from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { ActivityFeedResult, ProjectAnalyticsSummary } from '../types/analytics'

export const analyticsApi = {
  async getPlatformSummary(): Promise<ProjectAnalyticsSummary> {
    const { data } = await api.get<ApiResponse<ProjectAnalyticsSummary>>('/analytics/summary')

    return data.data
  },

  async getProjectSummary(projectId: string): Promise<ProjectAnalyticsSummary> {
    const { data } = await api.get<ApiResponse<ProjectAnalyticsSummary>>(
      `/analytics/projects/${projectId}/summary`
    )

    return data.data
  },

  async getPlatformActivity(page?: number, pageSize?: number): Promise<ActivityFeedResult> {
    const { data } = await api.get<ApiResponse<ActivityFeedResult>>('/analytics/activity', {
      params: { page, pageSize },
    })

    return data.data
  },

  async getProjectActivity(
    projectId: string,
    page?: number,
    pageSize?: number
  ): Promise<ActivityFeedResult> {
    const { data } = await api.get<ApiResponse<ActivityFeedResult>>(
      `/analytics/projects/${projectId}/activity`,
      { params: { page, pageSize } }
    )

    return data.data
  },
}
