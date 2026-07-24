import { useMutation, useQueryClient } from '@tanstack/react-query'

import { assetsApi } from '../api/assets.api'
import { assetVersionsQueryKey } from './use-asset-versions'
import type { AssetType } from '../types/asset'

export function useRegenerateAsset(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
    }: {
      assetType: AssetType
      sourceId: string
    }) => assetsApi.regenerateAsset(assetType, sourceId),

    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assets', projectId] }),
        queryClient.invalidateQueries({
          queryKey: assetVersionsQueryKey(variables.assetType, variables.sourceId),
        }),
      ])
    },
  })
}
