import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { UpdateBrandKitInput } from '../types/brand-kit'
import { brandKitsApi } from '../api/brand-kits.api'
import { brandKitsQueryKey } from './use-brand-kits'

export function useUpdateBrandKit(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBrandKitInput }) =>
      brandKitsApi.updateBrandKit(id, payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandKitsQueryKey(projectId),
      })
    },
  })
}
