import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  videoWorkflowPlannerApi,
  type PlanWorkflowInput,
} from '../api/video-workflow-planner.api'
import { videoWorkflowPlansQueryKey } from './use-video-workflow-plans'

// Sprint 7.2.3 added a listing endpoint (there wasn't one when this hook
// was first built in Sprint 7.2.2) — invalidating it here is what makes a
// freshly generated plan immediately selectable in the Execution panel.
export function usePlanVideoWorkflow(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PlanWorkflowInput) => videoWorkflowPlannerApi.planWorkflow(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: videoWorkflowPlansQueryKey(projectId),
      })
    },
  })
}
