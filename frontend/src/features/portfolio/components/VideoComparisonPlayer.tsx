import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDurationMs } from '@/lib/utils'
import { resolveStoredFileUrl } from '@/features/content-studio/api/images.api'
import { useVideoAssets } from '@/features/content-studio/hooks/use-video-assets'

interface VideoComparisonPlayerProps {
  projectId: string
  originalAssetId: string | null
  processedAssetId: string | null
}

function VideoPane({
  label,
  storagePath,
  durationMs,
  videoFormat,
}: {
  label: string
  storagePath: string | null | undefined
  durationMs?: number | null
  videoFormat?: string | null
}) {
  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium text-muted-foreground'>{label}</p>
      <video
        controls
        className='w-full rounded-md border bg-black'
        src={storagePath ? resolveStoredFileUrl(storagePath) : undefined}
      />
      {(durationMs != null || videoFormat) && (
        <p className='text-xs text-muted-foreground'>
          {durationMs != null ? formatDurationMs(durationMs) : null}
          {durationMs != null && videoFormat ? ' · ' : null}
          {videoFormat}
        </p>
      )}
    </div>
  )
}

// Purely presentational — no page in Content Studio has a side-by-side
// comparison view today, so this lives entirely in the portfolio feature
// rather than being bolted onto the shared Review Workspace. It reads the
// same VideoAsset data every other video-studio component reads via the
// existing useVideoAssets hook.
export function VideoComparisonPlayer({
  projectId,
  originalAssetId,
  processedAssetId,
}: VideoComparisonPlayerProps) {
  const videoAssets = useVideoAssets(projectId)
  const items = videoAssets.data?.items ?? []

  const original = items.find((asset) => asset.id === originalAssetId)
  const processed = items.find((asset) => asset.id === processedAssetId)

  if (!original && !processed) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Original vs. Processed</CardTitle>
      </CardHeader>

      <CardContent className='grid gap-4 sm:grid-cols-2'>
        <VideoPane
          label='Original upload'
          storagePath={original?.storagePath}
          durationMs={original?.durationMs}
          videoFormat={original?.videoFormat}
        />
        <VideoPane
          label='Processed result'
          storagePath={processed?.storagePath}
          durationMs={processed?.durationMs}
          videoFormat={processed?.videoFormat}
        />
      </CardContent>
    </Card>
  )
}
