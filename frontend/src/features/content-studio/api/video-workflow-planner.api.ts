import { api } from '@/services/api'
import type { ApiResponse } from '@/types/api'

// Ollama inference on this CPU-only hardware can genuinely take well over
// a minute — sized generously, same reasoning as video-sources.api.ts's
// upload timeout and video-execution.api.ts's execution timeout.
const PLAN_TIMEOUT_MS = 180_000

export type WorkflowOperation =
  | 'trim'
  | 'remove_silence'
  | 'normalize_audio'
  | 'resize'
  | 'shorts'
  | 'subtitles'
  | 'blur_faces'
  | 'auto_zoom'
  | 'brightness'
  | 'background_music'

export interface WorkflowStep {
  operation: WorkflowOperation
  params: Record<string, unknown>
}

export interface Workflow {
  steps: WorkflowStep[]
}

export interface VideoWorkflowPlan {
  id: string
  projectId: string
  videoAssetId: string
  prompt: string
  workflow: Workflow
  model: string | null
  // Sprint 7.2.3 — set once the Execution Engine has run this plan.
  resultVideoAssetId: string | null
  executedAt: string | null
  createdAt: string
}

export interface PlanWorkflowInput {
  videoAssetId: string
  prompt: string
}

export const videoWorkflowPlannerApi = {
  async planWorkflow(input: PlanWorkflowInput): Promise<VideoWorkflowPlan> {
    const { data } = await api.post<ApiResponse<VideoWorkflowPlan>>(
      '/video-edit/planner',
      input,
      { timeout: PLAN_TIMEOUT_MS }
    )

    return data.data
  },

  async listWorkflowPlans(projectId: string): Promise<VideoWorkflowPlan[]> {
    const { data } = await api.get<ApiResponse<VideoWorkflowPlan[]>>('/video-edit/planner', {
      params: { projectId },
    })

    return data.data
  },
}
