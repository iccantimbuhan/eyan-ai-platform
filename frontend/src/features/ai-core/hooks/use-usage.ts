import { useQuery } from '@tanstack/react-query'
import { aiCoreApi } from '../api/ai-core-api'

export function useUsage(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['ai-core', 'usage', page, pageSize],
    queryFn: () => aiCoreApi.listUsage({ page, pageSize }),
  })
}

export function useCostSummary() {
  return useQuery({ queryKey: ['ai-core', 'costs'], queryFn: aiCoreApi.getCostSummary })
}
