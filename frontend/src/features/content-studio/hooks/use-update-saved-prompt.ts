import { useMutation, useQueryClient } from '@tanstack/react-query'

import { savedPromptsApi } from '../api/saved-prompts.api'
import type { UpdateSavedPromptInput } from '../types/saved-prompt'
import { SAVED_PROMPTS_QUERY_KEY } from './use-saved-prompts'

export function useUpdateSavedPrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateSavedPromptInput
    }) => savedPromptsApi.updateSavedPrompt(id, payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SAVED_PROMPTS_QUERY_KEY,
      })
    },
  })
}
