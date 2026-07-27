import { useMutation, useQueryClient } from '@tanstack/react-query'

import { assetsApi } from '../api/assets.api'
import type { BatchAssetAction, BatchAssetItemRef } from '../types/asset'

export function useBatchAssetAction(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      items,
      action,
    }: {
      items: BatchAssetItemRef[]
      action: BatchAssetAction
    }) => assetsApi.batchAssetAction(items, action),

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assets', projectId] })
    },
  })
}
