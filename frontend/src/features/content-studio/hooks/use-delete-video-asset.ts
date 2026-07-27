import { useMutation, useQueryClient } from '@tanstack/react-query'

import { videoAssetsApi } from '../api/video-assets.api'
import { videoAssetsQueryKey } from './use-video-assets'

export function useDeleteVideoAsset(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => videoAssetsApi.deleteVideoAsset(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: videoAssetsQueryKey(projectId),
      })
    },
  })
}
