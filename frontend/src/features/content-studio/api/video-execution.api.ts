import { api } from '@/services/api'
import type { ApiResponse } from '@/types/api'

import type { VideoAsset } from '../types/video-asset'

export interface ExecuteWorkflowInput {
  workflowPlanId: string
}

// FFmpeg execution on this CPU-only hardware can genuinely take a while —
// sized generously, same reasoning as video-sources.api.ts's upload timeout.
const EXECUTE_TIMEOUT_MS = 600_000

export const videoExecutionApi = {
  async executeWorkflow(input: ExecuteWorkflowInput): Promise<VideoAsset> {
    const { data } = await api.post<ApiResponse<VideoAsset>>('/video-edit/execute', input, {
      timeout: EXECUTE_TIMEOUT_MS,
    })

    return data.data
  },
}
