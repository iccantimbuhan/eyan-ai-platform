import { api } from '@/services/api'
import type { ApiResponse } from '@/types/api'

import type {
  CreateSavedPromptInput,
  SavedPrompt,
  UpdateSavedPromptInput,
} from '../types/saved-prompt'

export const savedPromptsApi = {
  async getSavedPrompts(): Promise<SavedPrompt[]> {
    const { data } = await api.get<ApiResponse<SavedPrompt[]>>(
      '/saved-prompts'
    )

    return data.data
  },

  async createSavedPrompt(
    payload: CreateSavedPromptInput
  ): Promise<SavedPrompt> {
    const { data } = await api.post<ApiResponse<SavedPrompt>>(
      '/saved-prompts',
      payload
    )

    return data.data
  },

  async updateSavedPrompt(
    id: string,
    payload: UpdateSavedPromptInput
  ): Promise<SavedPrompt> {
    const { data } = await api.patch<ApiResponse<SavedPrompt>>(
      `/saved-prompts/${id}`,
      payload
    )

    return data.data
  },

  async deleteSavedPrompt(id: string): Promise<void> {
    await api.delete(`/saved-prompts/${id}`)
  },
}
