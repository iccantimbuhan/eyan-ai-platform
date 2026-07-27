import { useQuery } from '@tanstack/react-query'

import { analyticsApi } from '../api/analytics.api'

// Entirely read-only — no mutations, so no invalidation helpers are needed
// here (unlike every other hooks/use-asset-*.ts file in this feature).

export function platformAnalyticsSummaryQueryKey() {
  return ['analytics-summary'] as const
}

export function usePlatformAnalyticsSummary() {
  return useQuery({
    queryKey: platformAnalyticsSummaryQueryKey(),
    queryFn: () => analyticsApi.getPlatformSummary(),
  })
}

export function projectAnalyticsSummaryQueryKey(projectId: string) {
  return ['analytics-summary', projectId] as const
}

export function useProjectAnalyticsSummary(projectId: string) {
  return useQuery({
    queryKey: projectAnalyticsSummaryQueryKey(projectId),
    queryFn: () => analyticsApi.getProjectSummary(projectId),
    enabled: !!projectId,
  })
}

export function platformActivityQueryKey(page?: number, pageSize?: number) {
  return ['analytics-activity', page ?? 1, pageSize ?? 20] as const
}

export function usePlatformActivity(page?: number, pageSize?: number) {
  return useQuery({
    queryKey: platformActivityQueryKey(page, pageSize),
    queryFn: () => analyticsApi.getPlatformActivity(page, pageSize),
  })
}

export function projectActivityQueryKey(projectId: string, page?: number, pageSize?: number) {
  return ['analytics-activity', projectId, page ?? 1, pageSize ?? 20] as const
}

export function useProjectActivity(projectId: string, page?: number, pageSize?: number) {
  return useQuery({
    queryKey: projectActivityQueryKey(projectId, page, pageSize),
    queryFn: () => analyticsApi.getProjectActivity(projectId, page, pageSize),
    enabled: !!projectId,
  })
}
