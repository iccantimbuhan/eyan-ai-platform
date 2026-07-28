import type { AxiosProgressEvent } from 'axios'
import { api } from '@/services/api'
import type { ApiResponse } from '@/types/api'

import type { VideoAsset } from '../types/video-asset'

// ffprobe + a disk-to-disk move (see backend/src/services/video-source.service.ts)
// is fast, but the upload itself can legitimately take a while on a large
// file over a slow connection — sized the same as other generation
// timeouts in this feature (images.api.ts, video-assets.api.ts).
const UPLOAD_TIMEOUT_MS = 300_000

export interface UploadVideoSourceInput {
  projectId: string
  file: File
  videoGroupId?: string
  onUploadProgress?: (percent: number) => void
}

export const videoSourcesApi = {
  async uploadVideoSource(input: UploadVideoSourceInput): Promise<VideoAsset> {
    const formData = new FormData()
    formData.append('projectId', input.projectId)
    if (input.videoGroupId) formData.append('videoGroupId', input.videoGroupId)
    formData.append('file', input.file)

    const { data } = await api.post<ApiResponse<VideoAsset>>(
      '/video-edit/sources',
      formData,
      {
        timeout: UPLOAD_TIMEOUT_MS,
        onUploadProgress: (event: AxiosProgressEvent) => {
          if (!input.onUploadProgress || !event.total) return
          input.onUploadProgress(Math.round((event.loaded / event.total) * 100))
        },
      }
    )

    return data.data
  },
}
