import { useMutation, useQueryClient } from '@tanstack/react-query'

import { brandKitsApi } from '../api/brand-kits.api'
import { brandKitsQueryKey } from './use-brand-kits'

export function useDeleteBrandKit(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => brandKitsApi.deleteBrandKit(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandKitsQueryKey(projectId),
      })
    },
  })
}
