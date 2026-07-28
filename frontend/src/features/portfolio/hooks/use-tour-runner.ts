import { useEffect, useRef } from 'react'

import type { useExecuteWorkflow } from '@/features/content-studio/hooks/use-execute-workflow'
import type { usePlanVideoWorkflow } from '@/features/content-studio/hooks/use-plan-video-workflow'
import type { useReviewAsset } from '@/features/content-studio/hooks/use-review-asset'
import type { useUploadVideoSource } from '@/features/content-studio/hooks/use-upload-video-source'
import type { WorkflowOperation } from '@/features/content-studio/api/video-workflow-planner.api'

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

// The AI planner and the FFmpeg execution engine are intentionally
// decoupled (see backend/src/services/video-execution-engine.service.ts):
// the planner can propose any of 10 operations, but only these are wired
// up to actually execute yet. A real, unconstrained AI plan can genuinely
// include one of the other four — this mirrors FFmpegVideoProvider's
// SUPPORTED_OPERATIONS plus "subtitles".
const EXECUTABLE_OPERATIONS = new Set<WorkflowOperation>([
  'trim',
  'remove_silence',
  'normalize_audio',
  'resize',
  'brightness',
  'subtitles',
])

const MAX_PLAN_ATTEMPTS = 3

function isExecutablePlan(steps: { operation: WorkflowOperation }[]): boolean {
  return steps.every((step) => EXECUTABLE_OPERATIONS.has(step.operation))
}

// Orchestrates the guided portfolio tour on top of the real, unmodified
// Content Studio mutations for a single project — it never calls a
// business-logic endpoint that a manual click wouldn't also call, it just
// decides *when* to call them (including, for planning, calling it again
// when the AI proposes a plan this build can't execute yet — the same
// thing a human would do by clicking "Generate Plan" a second time).
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

    // The planner's own LLM call can fail outright (the backend already
    // retries malformed JSON internally, twice, before giving up) or can
    // succeed with an operation the execution engine doesn't run yet
    // (planner and executor are intentionally decoupled). Both are cases a
    // human would just click "Generate Plan" again for.
    if (planVideoWorkflow.isError) {
      if (attempts >= MAX_PLAN_ATTEMPTS) {
        tour.setError('AI workflow planning failed. Please restart the tour.')
        return
      }
      retry()
      return
    }

    if (planVideoWorkflow.isSuccess && planVideoWorkflow.data) {
      if (isExecutablePlan(planVideoWorkflow.data.workflow.steps)) {
        tour.setWorkflowPlanId(planVideoWorkflow.data.id)
        tour.setStep('execute')
        return
      }

      if (attempts >= MAX_PLAN_ATTEMPTS) {
        tour.setError(
          "The AI planner kept proposing operations this build can't execute yet. Please restart the tour."
        )
        return
      }
      retry()
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
