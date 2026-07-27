import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import {
  useArchivePublish,
  useAssetPublishing,
  usePublishAsset,
  useRetryPublish,
} from '../../hooks/use-asset-publishing'
import type { AssetType, ReviewStatus } from '../../types/asset'
import { PLATFORM_OPTIONS, PUBLISHING_STATUS_OPTIONS, type PublishingStatus } from '../../types/publishing'
import { PublishDialog } from './PublishDialog'

interface PublishingStatusPanelProps {
  projectId: string
  assetType: AssetType
  sourceId: string
  status: ReviewStatus
}

const STATUS_BADGE_VARIANT: Record<
  PublishingStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  DRAFT: 'outline',
  SCHEDULED: 'secondary',
  PUBLISHING: 'secondary',
  PUBLISHED: 'default',
  FAILED: 'destructive',
  ARCHIVED: 'outline',
}

function platformLabel(platform: string): string {
  return PLATFORM_OPTIONS.find((option) => option.value === platform)?.label ?? platform
}

function statusLabel(status: PublishingStatus): string {
  return PUBLISHING_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

// Publishing is a workflow independent of QA review (ReviewStatus stays
// untouched) — gated on the asset being APPROVED, but otherwise decoupled.
// See ADR-0010.
export function PublishingStatusPanel({
  projectId,
  assetType,
  sourceId,
  status,
}: PublishingStatusPanelProps) {
  const { data: records, isLoading, isError } = useAssetPublishing(assetType, sourceId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const publishAsset = usePublishAsset(projectId)
  const retryPublish = useRetryPublish(projectId)
  const archivePublish = useArchivePublish(projectId)

  const isApproved = status === 'APPROVED'

  const handlePublishNow = (platform: string) => {
    publishAsset.mutate(
      { assetType, sourceId, platform },
      {
        onSuccess: () => toast.success('Asset published.'),
        onError: () => toast.error('Publishing failed.'),
      }
    )
  }

  const handleRetry = (platform: string) => {
    retryPublish.mutate(
      { assetType, sourceId, platform },
      {
        onSuccess: () => toast.success('Publishing retried.'),
        onError: () => toast.error('Retry failed.'),
      }
    )
  }

  const handleArchive = (platform: string) => {
    archivePublish.mutate(
      { assetType, sourceId, platform },
      {
        onSuccess: () => toast.success('Publishing record archived.'),
        onError: () => toast.error('Failed to archive.'),
      }
    )
  }

  return (
    <div className='space-y-4'>
      {!isApproved && (
        <p className='text-sm text-muted-foreground'>
          This asset must be approved before it can be scheduled or published.
        </p>
      )}

      <Button size='sm' onClick={() => setDialogOpen(true)} disabled={!isApproved}>
        Schedule / Publish
      </Button>

      {isLoading && (
        <div role='status' aria-label='Loading publishing records' className='space-y-2'>
          <Skeleton className='h-10 w-full' />
        </div>
      )}

      {isError && <p className='text-sm text-destructive'>Failed to load publishing records.</p>}

      {!isLoading && !isError && (records?.length ?? 0) === 0 && (
        <p className='text-sm text-muted-foreground'>Not published to any platform yet.</p>
      )}

      {!isLoading && !isError && records && records.length > 0 && (
        <ul className='space-y-2'>
          {records.map((record) => (
            <li
              key={record.platform}
              className='flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm'
            >
              <div className='min-w-0 space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-medium'>{platformLabel(record.platform)}</span>
                  <Badge variant={STATUS_BADGE_VARIANT[record.status]}>
                    {statusLabel(record.status)}
                  </Badge>
                </div>

                {record.status === 'SCHEDULED' && record.scheduledFor && (
                  <p className='text-xs text-muted-foreground'>
                    Scheduled for {new Date(record.scheduledFor).toLocaleString()}
                  </p>
                )}

                {record.status === 'PUBLISHED' && record.externalUrl && (
                  <a
                    href={record.externalUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='text-xs text-primary hover:underline'
                  >
                    View published post
                  </a>
                )}

                {record.status === 'FAILED' && record.errorMessage && (
                  <p className='text-xs text-destructive'>{record.errorMessage}</p>
                )}
              </div>

              <div className='flex shrink-0 flex-wrap gap-1'>
                {(record.status === 'DRAFT' || record.status === 'SCHEDULED') && (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => handlePublishNow(record.platform)}
                    disabled={publishAsset.isPending}
                  >
                    Publish Now
                  </Button>
                )}
                {record.status === 'FAILED' && (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => handleRetry(record.platform)}
                    disabled={retryPublish.isPending}
                  >
                    Retry
                  </Button>
                )}
                {record.status !== 'ARCHIVED' && (
                  <Button
                    size='sm'
                    variant='outline'
                    className='text-destructive'
                    onClick={() => handleArchive(record.platform)}
                    disabled={archivePublish.isPending}
                  >
                    Archive
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <PublishDialog
        projectId={projectId}
        assetType={assetType}
        sourceId={sourceId}
        status={status}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
