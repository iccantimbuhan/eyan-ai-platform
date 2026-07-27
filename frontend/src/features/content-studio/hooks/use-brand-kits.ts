import { useQuery } from '@tanstack/react-query'

import { brandKitsApi } from '../api/brand-kits.api'

export function brandKitsQueryKey(projectId: string) {
  return ['brand-kits', projectId] as const
}

export function useBrandKits(projectId: string) {
  return useQuery({
    queryKey: brandKitsQueryKey(projectId),
    queryFn: () => brandKitsApi.listBrandKits(projectId),
    enabled: !!projectId,
  })
}
