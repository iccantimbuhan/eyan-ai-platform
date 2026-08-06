import { useQuery } from '@tanstack/react-query'
import { getTenantContext } from '../api/organizations-api'

export function useTenantContext() {
  return useQuery({
    queryKey: ['tenant-context'],
    queryFn: getTenantContext,
  })
}
