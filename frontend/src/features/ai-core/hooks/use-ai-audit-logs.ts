import { useQuery } from '@tanstack/react-query'
import { aiCoreApi } from '../api/ai-core-api'

export function useAiAuditLogs(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['ai-core', 'audit-logs', page, pageSize],
    queryFn: () => aiCoreApi.listAuditLogs({ page, pageSize }),
  })
}
