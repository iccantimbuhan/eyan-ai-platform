import { useQuery } from '@tanstack/react-query'

import { videoWorkflowPlannerApi } from '../api/video-workflow-planner.api'

export function videoWorkflowPlansQueryKey(projectId: string) {
  return ['video-workflow-plans', projectId] as const
}

export function useVideoWorkflowPlans(projectId: string) {
  return useQuery({
    queryKey: videoWorkflowPlansQueryKey(projectId),
    queryFn: () => videoWorkflowPlannerApi.listWorkflowPlans(projectId),
    enabled: !!projectId,
  })
}
