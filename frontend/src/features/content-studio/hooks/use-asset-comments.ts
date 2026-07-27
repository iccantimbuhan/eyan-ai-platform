import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { reviewWorkspaceApi } from '../api/review-workspace.api'
import { assetQueryKey } from './use-asset'
import { assetTimelineQueryKey } from './use-asset-timeline'
import type { AssetType } from '../types/asset'
import type { CreateAssetCommentInput } from '../types/review-workspace'

export function assetCommentsQueryKey(assetType: AssetType, sourceId: string) {
  return ['asset-comments', assetType, sourceId] as const
}

export function useAssetComments(assetType: AssetType, sourceId: string) {
  return useQuery({
    queryKey: assetCommentsQueryKey(assetType, sourceId),
    queryFn: () => reviewWorkspaceApi.listComments(assetType, sourceId),
    enabled: !!sourceId,
  })
}

// Nearly every mutation below invalidates the same four things: its own
// list, the timeline (every action produces an event), the asset detail
// (comment counts mirror there), and the project's asset list (comment
// counts also surface on Asset Library / Review Queue cards) — same
// dual/triple-invalidate pattern useReviewAsset already establishes.
function invalidateAll(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  assetType: AssetType,
  sourceId: string
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: assetCommentsQueryKey(assetType, sourceId) }),
    queryClient.invalidateQueries({ queryKey: assetTimelineQueryKey(assetType, sourceId) }),
    queryClient.invalidateQueries({ queryKey: assetQueryKey(assetType, sourceId) }),
    queryClient.invalidateQueries({ queryKey: ['assets', projectId] }),
  ])
}

export function useAddComment(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
      payload,
    }: {
      assetType: AssetType
      sourceId: string
      payload: CreateAssetCommentInput
    }) => reviewWorkspaceApi.createComment(assetType, sourceId, payload),

    onSuccess: (_data, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
  })
}

export function useResolveComment(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
      commentId,
    }: {
      assetType: AssetType
      sourceId: string
      commentId: string
    }) => reviewWorkspaceApi.resolveComment(assetType, sourceId, commentId),

    onSuccess: (_data, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
  })
}

export function useDeleteComment(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
      commentId,
    }: {
      assetType: AssetType
      sourceId: string
      commentId: string
    }) => reviewWorkspaceApi.deleteComment(assetType, sourceId, commentId),

    onSuccess: (_data, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
  })
}
