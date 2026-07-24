import { useQuery } from '@tanstack/react-query'

import { assetsApi } from '../api/assets.api'
import type { AssetType } from '../types/asset'

export function assetVersionsQueryKey(assetType: AssetType, sourceId: string) {
  return ['asset-versions', assetType, sourceId] as const
}

export function useAssetVersions(assetType: AssetType, sourceId: string) {
  return useQuery({
    queryKey: assetVersionsQueryKey(assetType, sourceId),
    queryFn: () => assetsApi.getAssetVersions(assetType, sourceId),
    enabled: !!sourceId,
  })
}
