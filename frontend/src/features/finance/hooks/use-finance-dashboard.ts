import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/finance-api'

export function useFinanceDashboard(period?: string) {
  return useQuery({
    queryKey: ['finance-dashboard', period ?? null],
    queryFn: () => getDashboard(period),
  })
}
