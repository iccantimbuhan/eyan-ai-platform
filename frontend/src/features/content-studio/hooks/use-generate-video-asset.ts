import { useMutation, useQueryClient } from '@tanstack/react-query'

import { videoAssetsApi } from '../api/video-assets.api'
import { videoAssetsQueryKey } from './use-video-assets'
import type { GenerateVideoAssetInput } from '../types/video-asset'

export function useGenerateVideoAsset(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GenerateVideoAssetInput) =>
      videoAssetsApi.generateVideoAsset(payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: videoAssetsQueryKey(projectId),
      })
    },
  })
}
