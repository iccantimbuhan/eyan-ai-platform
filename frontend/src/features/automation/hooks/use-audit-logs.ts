import { useQuery } from '@tanstack/react-query'
import { automationApi } from '../api/automation-api'

export function useAuditLogs(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['automation', 'audit-logs', page, pageSize] as const,
    queryFn: () => automationApi.listAuditLogs({ page, pageSize }),
  })
}
