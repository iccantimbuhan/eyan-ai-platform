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

// Matches the backend's AI provider request timeout (REQUEST_TIMEOUT_MS in
// backend/src/providers/ollama/ollama.provider.ts). Generation can take up
// to several minutes on current hardware — the app-wide 30s default in
// services/api.ts would abort the client before the backend does, even
// though the backend goes on to complete and save the content anyway.
const GENERATION_TIMEOUT_MS = 180_000

export const contentApi = {
  async generateContent(
    payload: GenerateContentRequest
  ): Promise<GeneratedContentItem> {
    const { data } = await api.post<ApiResponse<GeneratedContentItem>>(
      '/content/generate',
      payload,
      { timeout: GENERATION_TIMEOUT_MS }
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
