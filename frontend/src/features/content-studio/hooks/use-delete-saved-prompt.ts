import { useMutation, useQueryClient } from '@tanstack/react-query'

import { savedPromptsApi } from '../api/saved-prompts.api'
import { SAVED_PROMPTS_QUERY_KEY } from './use-saved-prompts'

export function useDeleteSavedPrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => savedPromptsApi.deleteSavedPrompt(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SAVED_PROMPTS_QUERY_KEY,
      })
    },
  })
}
