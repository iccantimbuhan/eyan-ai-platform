import { useEffect, useRef } from 'react'

import type { useExecuteWorkflow } from '@/features/content-studio/hooks/use-execute-workflow'
import type { usePlanVideoWorkflow } from '@/features/content-studio/hooks/use-plan-video-workflow'
import type { useReviewAsset } from '@/features/content-studio/hooks/use-review-asset'
import type { useUploadVideoSource } from '@/features/content-studio/hooks/use-upload-video-source'

import { DEMO_VIDEO_FILENAME, DEMO_VIDEO_URL, DEMO_WORKFLOW_PROMPT } from '../data/tour-steps'
import { useTourStore } from '../store/tour-store'

type ProjectWorkspaceTab =
  | 'content'
  | 'images'
  | 'brand-kits'
  | 'video'
  | 'assets'
  | 'review'
  | 'publishing'
  | 'analytics'

interface UseTourRunnerArgs {
  projectId: string
  uploadVideoSource: ReturnType<typeof useUploadVideoSource>
  planVideoWorkflow: ReturnType<typeof usePlanVideoWorkflow>
  executeWorkflow: ReturnType<typeof useExecuteWorkflow>
  reviewAsset: ReturnType<typeof useReviewAsset>
  activeTab: ProjectWorkspaceTab
  setActiveTab: (tab: ProjectWorkspaceTab) => void
}

const MAX_PLAN_ATTEMPTS = 3

// Orchestrates the guided portfolio tour on top of the real, unmodified
// Content Studio mutations for a single project — it never calls a
// business-logic endpoint that a manual click wouldn't also call, it just
// decides *when* to call them (including, for planning, retrying when the
// AI's response fails validation — the same thing a human would do by
// clicking "Generate Plan" a second time). The backend's Zod schema
// (video-workflow-plan.validator.ts) only ever accepts operations the
// execution engine can run, so a *successful* plan response is always
// executable — this hook no longer needs its own executable-operations
// check on top of that.
export function useTourRunner({
  projectId,
  uploadVideoSource,
  planVideoWorkflow,
  executeWorkflow,
  reviewAsset,
  activeTab,
  setActiveTab,
}: UseTourRunnerArgs) {
  const tour = useTourStore()
  const isActive = tour.demoProjectId === projectId && tour.step !== 'idle'

  const planAttempt = useRef<{ assetId: string; count: number } | null>(null)
  const executeAttempt = useRef<string | null>(null)

  useEffect(() => {
    if (!isActive || tour.autoUploadFile) return

    let cancelled = false

    fetch(DEMO_VIDEO_URL)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return
        tour.setAutoUploadFile(new File([blob], DEMO_VIDEO_FILENAME, { type: 'video/mp4' }))
      })
      .catch(() => {
        if (!cancelled) tour.setError('Could not load the bundled demo clip.')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, tour.autoUploadFile])

  useEffect(() => {
    if (!isActive || tour.step !== 'upload') return

    if (uploadVideoSource.isError) {
      tour.setError('The demo upload failed. Please restart the tour.')
      return
    }

    if (uploadVideoSource.isSuccess && uploadVideoSource.data) {
      tour.setSourceVideoAssetId(uploadVideoSource.data.id)
      tour.setStep('plan')
    }
  }, [
    isActive,
    tour.step,
    uploadVideoSource.isSuccess,
    uploadVideoSource.isError,
    uploadVideoSource.data,
    tour,
  ])

  useEffect(() => {
    if (!isActive || tour.step !== 'plan' || !tour.sourceVideoAssetId) return

    if (planVideoWorkflow.isPending) return

    const attempts =
      planAttempt.current?.assetId === tour.sourceVideoAssetId ? planAttempt.current.count : 0

    const retry = () => {
      planAttempt.current = { assetId: tour.sourceVideoAssetId!, count: attempts + 1 }
      planVideoWorkflow.mutate({
        videoAssetId: tour.sourceVideoAssetId!,
        prompt: DEMO_WORKFLOW_PROMPT,
      })
    }

    // The planner's own LLM call can fail outright — malformed JSON, or an
    // operation outside the executable set the Zod schema now enforces
    // (the backend already retries this internally, twice, before giving
    // up). A case a human would just click "Generate Plan" again for.
    if (planVideoWorkflow.isError) {
      if (attempts >= MAX_PLAN_ATTEMPTS) {
        tour.setError('AI workflow planning failed. Please restart the tour.')
        return
      }
      retry()
      return
    }

    if (planVideoWorkflow.isSuccess && planVideoWorkflow.data) {
      tour.setWorkflowPlanId(planVideoWorkflow.data.id)
      tour.setStep('execute')
      return
    }

    if (planAttempt.current?.assetId !== tour.sourceVideoAssetId) {
      planAttempt.current = { assetId: tour.sourceVideoAssetId, count: 1 }
      planVideoWorkflow.mutate({
        videoAssetId: tour.sourceVideoAssetId,
        prompt: DEMO_WORKFLOW_PROMPT,
      })
    }
  }, [
    isActive,
    tour.step,
    tour.sourceVideoAssetId,
    planVideoWorkflow,
    planVideoWorkflow.isPending,
    planVideoWorkflow.isSuccess,
    planVideoWorkflow.isError,
    planVideoWorkflow.data,
    tour,
  ])

  useEffect(() => {
    if (!isActive || tour.step !== 'execute' || !tour.workflowPlanId) return

    if (executeWorkflow.isPending) return

    if (executeWorkflow.isError) {
      tour.setError('Workflow execution failed. Please restart the tour.')
      return
    }

    if (executeWorkflow.isSuccess && executeWorkflow.data) {
      tour.setResultVideoAssetId(executeWorkflow.data.id)
      tour.setStep('review')
      return
    }

    if (executeAttempt.current !== tour.workflowPlanId) {
      executeAttempt.current = tour.workflowPlanId
      executeWorkflow.mutate({ workflowPlanId: tour.workflowPlanId })
    }
  }, [
    isActive,
    tour.step,
    tour.workflowPlanId,
    executeWorkflow,
    executeWorkflow.isPending,
    executeWorkflow.isSuccess,
    executeWorkflow.isError,
    executeWorkflow.data,
    tour,
  ])

  useEffect(() => {
    if (!isActive) return

    const desiredTab: ProjectWorkspaceTab | undefined =
      tour.step === 'upload' || tour.step === 'plan' || tour.step === 'execute'
        ? 'video'
        : tour.step === 'review'
          ? 'review'
          : tour.step === 'publish'
            ? 'publishing'
            : undefined

    if (desiredTab && activeTab !== desiredTab) setActiveTab(desiredTab)
  }, [isActive, tour.step, activeTab, setActiveTab])

  const continueToPublish = () => {
    if (!tour.resultVideoAssetId) return

    reviewAsset.mutate(
      {
        assetType: 'VIDEO',
        sourceId: tour.resultVideoAssetId,
        payload: { status: 'APPROVED' },
      },
      {
        onSuccess: () => tour.setStep('publish'),
        onError: () => tour.setError('Could not mark the asset ready for publishing.'),
      }
    )
  }

  const finishTour = () => tour.setStep('recap')

  return {
    isActive,
    step: tour.step,
    error: tour.error,
    autoUploadFile: isActive ? tour.autoUploadFile : null,
    initialVideoAssetId: isActive ? (tour.sourceVideoAssetId ?? undefined) : undefined,
    initialPrompt: isActive ? DEMO_WORKFLOW_PROMPT : undefined,
    initialWorkflowPlanId: isActive ? (tour.workflowPlanId ?? undefined) : undefined,
    sourceVideoAssetId: tour.sourceVideoAssetId,
    resultVideoAssetId: tour.resultVideoAssetId,
    reviewIsPending: reviewAsset.isPending,
    continueToPublish,
    finishTour,
  }
}
