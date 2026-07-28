import { useMutation, useQueryClient } from '@tanstack/react-query'

import { videoExecutionApi, type ExecuteWorkflowInput } from '../api/video-execution.api'
import { videoAssetsQueryKey } from './use-video-assets'
import { videoWorkflowPlansQueryKey } from './use-video-workflow-plans'

// Invalidates video assets (a new EDITED_VIDEO row was created — same
// convention as useUploadVideoSource) and workflow plans (the executed
// plan's resultVideoAssetId/executedAt changed).
export function useExecuteWorkflow(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ExecuteWorkflowInput) => videoExecutionApi.executeWorkflow(input),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: videoAssetsQueryKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: videoWorkflowPlansQueryKey(projectId) }),
      ])
    },
  })
}
