import { useMutation, useQueryClient } from '@tanstack/react-query'

import { reviewWorkspaceApi } from '../api/review-workspace.api'
import { assetQueryKey } from './use-asset'
import { assetTimelineQueryKey } from './use-asset-timeline'
import type { AssetType } from '../types/asset'
import type { AssignReviewerInput } from '../types/review-workspace'

// There's no standalone GET .../assignment query hook — the current
// assignee already rides along on AssetDetail.assignee (useAsset),
// batch-fetched the same way as review/version. Only the mutations live
// here.

function invalidateAll(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  assetType: AssetType,
  sourceId: string
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: assetTimelineQueryKey(assetType, sourceId) }),
    queryClient.invalidateQueries({ queryKey: assetQueryKey(assetType, sourceId) }),
    queryClient.invalidateQueries({ queryKey: ['assets', projectId] }),
  ])
}

export function useAssignReviewer(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
      payload,
    }: {
      assetType: AssetType
      sourceId: string
      payload: AssignReviewerInput
    }) => reviewWorkspaceApi.assignReviewer(assetType, sourceId, payload),

    onSuccess: (_data, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
  })
}

export function useUnassignReviewer(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ assetType, sourceId }: { assetType: AssetType; sourceId: string }) =>
      reviewWorkspaceApi.unassignReviewer(assetType, sourceId),

    onSuccess: (_data, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
  })
}
