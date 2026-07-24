import { useMutation, useQueryClient } from '@tanstack/react-query'

import { assetsApi } from '../api/assets.api'
import type { AssetType } from '../types/asset'

export function useDeleteAsset(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
    }: {
      assetType: AssetType
      sourceId: string
    }) => assetsApi.deleteAsset(assetType, sourceId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assets', projectId] })
    },
  })
}
