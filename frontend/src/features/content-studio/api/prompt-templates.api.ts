import { api } from '@/services/api'
import type { ApiResponse } from '@/types/api'

import type { PromptTemplate } from '../types/prompt-template'

export const promptTemplatesApi = {
  async getTemplates(): Promise<PromptTemplate[]> {
    const { data } = await api.get<ApiResponse<PromptTemplate[]>>(
      '/prompt-templates'
    )

    return data.data
  },
}
