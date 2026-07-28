import { useMutation, useQueryClient } from '@tanstack/react-query'

import { videoSourcesApi, type UploadVideoSourceInput } from '../api/video-sources.api'
import { videoAssetsQueryKey } from './use-video-assets'

// Invalidates the same query VideoAssetList already reads (useVideoAssets)
// so an uploaded source appears in the existing list with no separate
// query/cache path — the whole point of reusing VideoAsset (Sprint 7.2.1).
export function useUploadVideoSource(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UploadVideoSourceInput) =>
      videoSourcesApi.uploadVideoSource(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: videoAssetsQueryKey(projectId),
      })
    },
  })
}
