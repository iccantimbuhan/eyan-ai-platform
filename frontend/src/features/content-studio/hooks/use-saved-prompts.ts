import { useQuery } from '@tanstack/react-query'

import { savedPromptsApi } from '../api/saved-prompts.api'

export const SAVED_PROMPTS_QUERY_KEY = ['saved-prompts']

export function useSavedPrompts() {
  return useQuery({
    queryKey: SAVED_PROMPTS_QUERY_KEY,
    queryFn: () => savedPromptsApi.getSavedPrompts(),
  })
}
