import {
  Check,
  GitBranch,
  MessageSquare,
  Pin,
  Rocket,
  RotateCcw,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

import { useAssetTimeline } from '../../hooks/use-asset-timeline'
import { REVIEW_STATUS_OPTIONS, type AssetType } from '../../types/asset'
import type { AssetReviewEvent, ReviewEventType } from '../../types/review-workspace'

interface ReviewTimelineProps {
  assetType: AssetType
  sourceId: string
}

function statusLabel(status: string | null): string {
  if (!status) return ''
  return REVIEW_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

const EVENT_ICONS: Record<ReviewEventType, typeof Check> = {
  STATUS_CHANGED: RotateCcw,
  COMMENT_ADDED: MessageSquare,
  COMMENT_RESOLVED: Check,
  ANNOTATION_ADDED: Pin,
  ASSIGNED: UserPlus,
  UNASSIGNED: UserMinus,
  VERSION_CREATED: GitBranch,
  PUBLISH_SCHEDULED: Rocket,
  PUBLISH_STARTED: Rocket,
  PUBLISHED: Rocket,
  PUBLISH_FAILED: X,
}

function describeEvent(event: AssetReviewEvent): string {
  switch (event.type) {
    case 'STATUS_CHANGED':
      return `${event.actorName} changed status to ${statusLabel(event.toStatus)}`
    case 'COMMENT_ADDED':
      return `${event.actorName} added a comment`
    case 'COMMENT_RESOLVED':
      return `${event.actorName} resolved a comment`
    case 'ANNOTATION_ADDED':
      return `${event.actorName} added an annotation`
    case 'ASSIGNED':
      return `${event.actorName} assigned a reviewer`
    case 'UNASSIGNED':
      return `${event.actorName} removed the reviewer assignment`
    case 'VERSION_CREATED':
      return `${event.actorName} generated a new version`
    case 'PUBLISH_SCHEDULED':
      return `${event.actorName} scheduled publishing`
    case 'PUBLISH_STARTED':
      return `${event.actorName} started publishing`
    case 'PUBLISHED':
      return `${event.actorName} published this asset`
    case 'PUBLISH_FAILED':
      return `${event.actorName}'s publish attempt failed`
  }
}

export function ReviewTimeline({ assetType, sourceId }: ReviewTimelineProps) {
  const { data: events, isLoading, isError } = useAssetTimeline(assetType, sourceId)

  if (isLoading) {
    return (
      <div role='status' aria-label='Loading timeline' className='space-y-2'>
        <Skeleton className='h-8 w-full' />
        <Skeleton className='h-8 w-full' />
      </div>
    )
  }

  if (isError) {
    return <p className='text-sm text-destructive'>Failed to load timeline.</p>
  }

  if (!events || events.length === 0) {
    return <p className='text-sm text-muted-foreground'>No activity yet.</p>
  }

  return (
    <ol className='space-y-3'>
      {events.map((event) => {
        const Icon = EVENT_ICONS[event.type] ?? MessageSquare

        return (
          <li key={event.id} className='flex items-start gap-2 text-sm'>
            <Icon className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
            <div>
              <p>{describeEvent(event)}</p>
              <p className='text-xs text-muted-foreground'>
                {new Date(event.createdAt).toLocaleString()}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
