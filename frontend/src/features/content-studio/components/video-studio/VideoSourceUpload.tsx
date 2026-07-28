import { useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDurationMs } from '@/lib/utils'

import { resolveStoredFileUrl } from '../../api/images.api'
import type { useUploadVideoSource } from '../../hooks/use-upload-video-source'

interface VideoSourceUploadProps {
  projectId: string
  uploadVideoSource: ReturnType<typeof useUploadVideoSource>
}

// Same reasoning as VideoGenerateForm's own extractErrorMessage: the
// backend already sanitizes ingestion failures (invalid file, ffprobe
// rejection, storage failure) into a safe message before they reach the
// API response — see backend/src/services/video-source.service.ts.
function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const serverMessage = (error.response?.data as { error?: string } | undefined)
      ?.error

    if (serverMessage) return serverMessage
  }

  return 'Failed to upload video. Please try again.'
}

export function VideoSourceUpload({ projectId, uploadVideoSource }: VideoSourceUploadProps) {
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProgress(0)
    uploadVideoSource.mutate(
      {
        projectId,
        file,
        onUploadProgress: setProgress,
      },
      {
        onSettled: () => {
          if (fileInputRef.current) fileInputRef.current.value = ''
        },
      }
    )
  }

  const uploaded = uploadVideoSource.data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Video</CardTitle>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div className='flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center'>
          <UploadCloud className='h-8 w-8 text-muted-foreground' />
          <p className='text-sm text-muted-foreground'>
            Upload a source video (mp4, mov, or webm) to edit later.
          </p>

          <input
            ref={fileInputRef}
            type='file'
            accept='video/mp4,video/quicktime,video/webm,video/x-matroska'
            className='hidden'
            id='video-source-file'
            onChange={handleFileChange}
          />

          <Button
            variant='outline'
            disabled={uploadVideoSource.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadVideoSource.isPending ? 'Uploading...' : 'Choose file'}
          </Button>
        </div>

        {uploadVideoSource.isPending && (
          <div
            className='h-2 w-full overflow-hidden rounded-full bg-muted'
            role='progressbar'
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className='h-full bg-primary transition-all'
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {uploadVideoSource.isError && (
          <p className='text-sm text-destructive'>
            {extractErrorMessage(uploadVideoSource.error)}
          </p>
        )}

        {uploaded && (
          <div className='space-y-2 rounded-md border p-3'>
            <video
              controls
              className='w-full max-w-sm rounded-md border'
              src={uploaded.storagePath ? resolveStoredFileUrl(uploaded.storagePath) : undefined}
            />
            <div className='text-sm text-muted-foreground'>
              <p>{uploaded.sourceFileName}</p>
              <p>
                {uploaded.width}×{uploaded.height} · {formatDurationMs(uploaded.durationMs)} ·{' '}
                {uploaded.videoFormat}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
