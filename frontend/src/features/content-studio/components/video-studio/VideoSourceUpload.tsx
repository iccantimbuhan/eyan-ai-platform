import { useEffect, useRef, useState } from 'react'
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
  // Lets an external orchestrator (the portfolio guided tour) supply a
  // pre-fetched File and have it go through the exact same upload mutation
  // a real "Choose file" selection triggers — no separate upload path.
  autoUploadFile?: File | null
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

export function VideoSourceUpload({
  projectId,
  uploadVideoSource,
  autoUploadFile,
}: VideoSourceUploadProps) {
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoUploadStarted = useRef(false)

  const startUpload = (file: File) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    startUpload(file)
  }

  useEffect(() => {
    if (!autoUploadFile || autoUploadStarted.current) return

    autoUploadStarted.current = true
    startUpload(autoUploadFile)
    // startUpload closes over the latest mutation/projectId on every render;
    // re-running it when those identities change would re-trigger a
    // completed auto-upload, so this effect intentionally only reacts to
    // autoUploadFile itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoUploadFile])

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
