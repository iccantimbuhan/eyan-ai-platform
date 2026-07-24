import { useQuery } from '@tanstack/react-query'

import { assetsApi } from '../api/assets.api'
import type { ListAssetsParams } from '../types/asset'

// React Query's invalidateQueries does prefix matching by default, so every
// mutation hook below only ever needs to invalidate the two-element prefix
// ['assets', projectId] — it doesn't need to know which filters/pagination
// any currently-mounted useAssets() call is using.
export function assetsQueryKey(projectId: string, filters?: ListAssetsParams) {
  return ['assets', projectId, filters ?? {}] as const
}

export function useAssets(projectId: string, filters?: ListAssetsParams) {
  return useQuery({
    queryKey: assetsQueryKey(projectId, filters),
    queryFn: () => assetsApi.listAssets(projectId, filters),
    enabled: !!projectId,
  })
}
