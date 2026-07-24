import { useQuery } from '@tanstack/react-query'

import { assetsApi } from '../api/assets.api'
import type { AssetType } from '../types/asset'

export function assetQueryKey(assetType: AssetType, sourceId: string) {
  return ['asset', assetType, sourceId] as const
}

export function useAsset(assetType: AssetType, sourceId: string) {
  return useQuery({
    queryKey: assetQueryKey(assetType, sourceId),
    queryFn: () => assetsApi.getAsset(assetType, sourceId),
    enabled: !!sourceId,
  })
}
