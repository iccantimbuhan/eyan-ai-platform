import { useMutation, useQueryClient } from '@tanstack/react-query'

import { brandKitsApi } from '../api/brand-kits.api'
import { brandKitsQueryKey } from './use-brand-kits'

export function useCreateBrandKit(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: brandKitsApi.createBrandKit,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandKitsQueryKey(projectId),
      })
    },
  })
}
