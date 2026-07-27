import { useQuery } from '@tanstack/react-query'

import { videoAssetsApi } from '../api/video-assets.api'

export function videoAssetsQueryKey(projectId: string) {
  return ['video-assets', projectId] as const
}

export function useVideoAssets(projectId: string) {
  return useQuery({
    queryKey: videoAssetsQueryKey(projectId),
    queryFn: () => videoAssetsApi.listVideoAssets(projectId),
    enabled: !!projectId,
  })
}
