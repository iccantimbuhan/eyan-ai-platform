import { useQuery } from '@tanstack/react-query'

import { reviewWorkspaceApi } from '../api/review-workspace.api'
import type { AssetType } from '../types/asset'

export function assetTimelineQueryKey(assetType: AssetType, sourceId: string) {
  return ['asset-timeline', assetType, sourceId] as const
}

export function useAssetTimeline(assetType: AssetType, sourceId: string) {
  return useQuery({
    queryKey: assetTimelineQueryKey(assetType, sourceId),
    queryFn: () => reviewWorkspaceApi.getTimeline(assetType, sourceId),
    enabled: !!sourceId,
  })
}
