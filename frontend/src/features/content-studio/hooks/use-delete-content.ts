import { useMutation, useQueryClient } from '@tanstack/react-query'

import { contentApi } from '../api/content.api'

export function useDeleteContent(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => contentApi.deleteContent(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['project-content', projectId],
      })
    },
  })
}
