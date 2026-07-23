import { api } from '@/services/api'
import type {
  ApiResponse,
  PaginatedResponse,
} from '@/types/api'

import type { ContentType, GeneratedContentItem } from '../types/content'

export interface ContentResponse {
  items: GeneratedContentItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface GenerateContentRequest {
  projectId: string
  type: ContentType
  prompt: string
}

export const contentApi = {
  async generateContent(
    payload: GenerateContentRequest
  ): Promise<GeneratedContentItem> {
    const { data } = await api.post<ApiResponse<GeneratedContentItem>>(
      '/content/generate',
      payload
    )

    return data.data
  },

  async getContent(
    projectId: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<ContentResponse> {
    const { data } = await api.get<PaginatedResponse<GeneratedContentItem>>(
      '/content',
      {
        params: {
          projectId,
          ...params,
        },
      }
    )

    return {
      items: data.data,
      pagination: data.meta,
    }
  },

  async deleteContent(id: string): Promise<void> {
    await api.delete(`/content/${id}`)
  },
}
