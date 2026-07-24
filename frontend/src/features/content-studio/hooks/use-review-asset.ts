import { useMutation, useQueryClient } from '@tanstack/react-query'

import { assetsApi } from '../api/assets.api'
import { assetQueryKey } from './use-asset'
import type { AssetType, ReviewAssetInput } from '../types/asset'

export function useReviewAsset(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
      payload,
    }: {
      assetType: AssetType
      sourceId: string
      payload: ReviewAssetInput
    }) => assetsApi.reviewAsset(assetType, sourceId, payload),

    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assets', projectId] }),
        queryClient.invalidateQueries({
          queryKey: assetQueryKey(variables.assetType, variables.sourceId),
        }),
      ])
    },
  })
}
