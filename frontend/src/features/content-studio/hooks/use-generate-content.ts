import { useMutation, useQueryClient } from '@tanstack/react-query'

import { contentApi, type GenerateContentRequest } from '../api/content.api'

export function useGenerateContent(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GenerateContentRequest) =>
      contentApi.generateContent(payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['project-content', projectId],
      })
    },
  })
}
