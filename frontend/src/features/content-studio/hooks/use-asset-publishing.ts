import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { publishingApi } from '../api/publishing.api'
import { assetQueryKey } from './use-asset'
import { assetTimelineQueryKey } from './use-asset-timeline'
import type { AssetType } from '../types/asset'
import type { SchedulePublishInput } from '../types/publishing'

export function assetPublishingQueryKey(assetType: AssetType, sourceId: string) {
  return ['asset-publishing', assetType, sourceId] as const
}

export function useAssetPublishing(assetType: AssetType, sourceId: string) {
  return useQuery({
    queryKey: assetPublishingQueryKey(assetType, sourceId),
    queryFn: () => publishingApi.list(assetType, sourceId),
    enabled: !!sourceId,
  })
}

// Same four-way invalidation convention established in Sprint 6.3
// (use-asset-assignment.ts's invalidateAll): own query, timeline (every
// publishing action writes an AssetReviewEvent), asset detail (status
// summary changes), and the project's asset list.
function invalidateAll(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  assetType: AssetType,
  sourceId: string
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: assetPublishingQueryKey(assetType, sourceId) }),
    queryClient.invalidateQueries({ queryKey: assetTimelineQueryKey(assetType, sourceId) }),
    queryClient.invalidateQueries({ queryKey: assetQueryKey(assetType, sourceId) }),
    queryClient.invalidateQueries({ queryKey: ['assets', projectId] }),
  ])
}

export function useSchedulePublish(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
      payload,
    }: {
      assetType: AssetType
      sourceId: string
      payload: SchedulePublishInput
    }) => publishingApi.schedule(assetType, sourceId, payload),

    onSuccess: (_data, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
  })
}

export function usePublishAsset(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
      platform,
    }: {
      assetType: AssetType
      sourceId: string
      platform: string
    }) => publishingApi.publish(assetType, sourceId, platform),

    onSuccess: (_data, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
    onError: (_error, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
  })
}

export function useRetryPublish(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
      platform,
    }: {
      assetType: AssetType
      sourceId: string
      platform: string
    }) => publishingApi.retry(assetType, sourceId, platform),

    onSuccess: (_data, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
    onError: (_error, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
  })
}

export function useArchivePublish(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetType,
      sourceId,
      platform,
    }: {
      assetType: AssetType
      sourceId: string
      platform: string
    }) => publishingApi.archive(assetType, sourceId, platform),

    onSuccess: (_data, variables) =>
      invalidateAll(queryClient, projectId, variables.assetType, variables.sourceId),
  })
}
