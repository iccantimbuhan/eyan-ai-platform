import { Film } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDurationMs } from '@/lib/utils'

import { resolveImageUrl, resolveStoredFileUrl } from '../../api/images.api'
import { useVideoAssets } from '../../hooks/use-video-assets'
import {
  isTextVideoKind,
  isVideoFileKind,
  videoKindLabel,
  type VideoAsset,
} from '../../types/video-asset'

interface VideoAssetListProps {
  projectId: string
}

interface VideoGroup {
  videoGroupId: string
  items: VideoAsset[]
  updatedAt: string
}

function groupByVideo(items: VideoAsset[]): VideoGroup[] {
  const groups = new Map<string, VideoAsset[]>()

  for (const item of items) {
    const existing = groups.get(item.videoGroupId) ?? []
    existing.push(item)
    groups.set(item.videoGroupId, existing)
  }

  return Array.from(groups.entries())
    .map(([videoGroupId, groupItems]) => ({
      videoGroupId,
      items: groupItems,
      updatedAt: groupItems.reduce(
        (latest, item) => (item.updatedAt > latest ? item.updatedAt : latest),
        groupItems[0]?.updatedAt ?? ''
      ),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function VideoAssetCard({ item }: { item: VideoAsset }) {
  return (
    <div className='space-y-2 rounded-md border p-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='outline'>{videoKindLabel(item.kind)}</Badge>
        {item.status === 'FAILED' && <Badge variant='destructive'>Failed</Badge>}
        {item.status === 'PENDING' && <Badge variant='secondary'>Pending</Badge>}
      </div>

      {isTextVideoKind(item.kind) ? (
        <p className='line-clamp-4 text-sm whitespace-pre-wrap'>
          {item.output ?? 'No output.'}
        </p>
      ) : isVideoFileKind(item.kind) && item.status === 'COMPLETED' && item.storagePath ? (
        <div className='space-y-1'>
          <video
            controls
            src={resolveStoredFileUrl(item.storagePath)}
            className='max-w-xs rounded-md border'
          />
          <p className='text-xs text-muted-foreground'>
            {item.width}×{item.height} · {formatDurationMs(item.durationMs)} ·{' '}
            {item.videoFormat}
          </p>
        </div>
      ) : item.status === 'COMPLETED' && item.storagePath ? (
        <img
          src={resolveImageUrl(item.storagePath)}
          alt={item.prompt}
          className='max-w-xs rounded-md border'
        />
      ) : (
        <p className='text-sm text-destructive'>
          {item.errorMessage ?? 'Generation did not complete.'}
        </p>
      )}
    </div>
  )
}

export function VideoAssetList({ projectId }: VideoAssetListProps) {
  const videoAssets = useVideoAssets(projectId)

  if (videoAssets.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Videos</CardTitle>
        </CardHeader>

        <CardContent role='status' aria-label='Loading video assets'>
          <Skeleton className='h-32 w-full' />
        </CardContent>
      </Card>
    )
  }

  if (videoAssets.isError) {
    return (
      <Card>
        <CardContent className='py-8'>
          <p className='text-sm text-destructive'>
            Failed to load video assets. Try refreshing the page.
          </p>
        </CardContent>
      </Card>
    )
  }

  const groups = groupByVideo(videoAssets.data?.items ?? [])

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center gap-2 py-12 text-center'>
          <Film className='h-8 w-8 text-muted-foreground' />
          <p className='text-sm text-muted-foreground'>
            Generated video artifacts will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-4'>
      {groups.map((group) => (
        <Card key={group.videoGroupId} data-presentation-target='content-studio.workspace.video.assets'>
          <CardHeader>
            <CardTitle className='text-base'>
              Video {group.videoGroupId.slice(0, 8)}
            </CardTitle>
          </CardHeader>

          <CardContent className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {group.items.map((item) => (
              <VideoAssetCard key={item.id} item={item} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
