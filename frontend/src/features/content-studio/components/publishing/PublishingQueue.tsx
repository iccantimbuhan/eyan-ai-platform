import { useState } from 'react'
import { Rocket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { useAssets } from '../../hooks/use-assets'
import { ASSET_TYPE_OPTIONS, type AssetSummary } from '../../types/asset'
import { PUBLISHING_STATUS_OPTIONS, type PublishingStatus } from '../../types/publishing'
import { AssetDetailSheet } from '../assets/AssetDetailSheet'
import { AssetPagination } from '../assets/AssetPagination'

const PUBLISHING_QUEUE_FILTERS: { value: PublishingStatus; label: string }[] =
  PUBLISHING_STATUS_OPTIONS.filter((option) => option.value !== 'DRAFT')

const PAGE_SIZE = 20

function assetTypeLabel(assetType: AssetSummary['assetType']): string {
  return ASSET_TYPE_OPTIONS.find((option) => option.value === assetType)?.label ?? assetType
}

interface PublishingQueueProps {
  projectId: string
}

// A deliberate sibling to ReviewQueue, not a merged tab bar with QA's
// status dimension — QA and Publishing are two independent workflows (see
// ADR-0010), so their queues stay visually and conceptually separate even
// though both are built on the same useAssets(projectId, filters) list
// endpoint and AssetSummary data.
export function PublishingQueue({ projectId }: PublishingQueueProps) {
  const [publishingStatus, setPublishingStatus] = useState<PublishingStatus>('SCHEDULED')
  const [page, setPage] = useState(1)
  const [viewingAsset, setViewingAsset] = useState<AssetSummary | null>(null)

  const [appliedStatus, setAppliedStatus] = useState(publishingStatus)
  if (publishingStatus !== appliedStatus) {
    setAppliedStatus(publishingStatus)
    setPage(1)
  }

  const assets = useAssets(projectId, { publishingStatus, page, pageSize: PAGE_SIZE })
  const items = assets.data?.items ?? []

  return (
    <Card data-presentation-target='content-studio.workspace.publishing.queue'>
      <CardContent className='space-y-4 p-4'>
        <Tabs
          value={publishingStatus}
          onValueChange={(value) => setPublishingStatus(value as PublishingStatus)}
        >
          <TabsList>
            {PUBLISHING_QUEUE_FILTERS.map((filter) => (
              <TabsTrigger key={filter.value} value={filter.value}>
                {filter.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {assets.isLoading && (
          <div role='status' aria-label='Loading publishing queue' className='space-y-3'>
            <Skeleton className='h-16 w-full' />
            <Skeleton className='h-16 w-full' />
          </div>
        )}

        {assets.isError && (
          <p className='text-sm text-destructive'>
            Failed to load the publishing queue. Try refreshing the page.
          </p>
        )}

        {!assets.isLoading && !assets.isError && assets.data && items.length === 0 && (
          <div className='flex flex-col items-center justify-center gap-2 py-12 text-center'>
            <Rocket className='h-8 w-8 text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>
              Nothing here — the queue is empty for this status.
            </p>
          </div>
        )}

        {!assets.isLoading && !assets.isError && assets.data && items.length > 0 && (
          <>
            <div className='space-y-2'>
              {items.map((item) => {
                const record = item.publishing.find(
                  (publishing) => publishing.status === publishingStatus
                )

                return (
                  <div
                    key={`${item.assetType}:${item.id}`}
                    className='flex flex-wrap items-center justify-between gap-3 rounded-md border p-3'
                  >
                    <div className='min-w-0 space-y-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <Badge variant='outline'>{assetTypeLabel(item.assetType)}</Badge>
                        {record && <Badge variant='secondary'>{record.platform}</Badge>}
                      </div>

                      <button
                        type='button'
                        className='block text-left text-sm font-medium hover:underline'
                        onClick={() => setViewingAsset(item)}
                      >
                        {item.title}
                      </button>

                      <p className='line-clamp-1 text-xs text-muted-foreground'>
                        {item.promptPreview}
                      </p>
                    </div>

                    <Button size='sm' variant='outline' onClick={() => setViewingAsset(item)}>
                      Open
                    </Button>
                  </div>
                )
              })}
            </div>

            <AssetPagination
              page={assets.data.pagination.page}
              pageSize={assets.data.pagination.pageSize}
              total={assets.data.pagination.total}
              totalPages={assets.data.pagination.totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>

      <AssetDetailSheet
        asset={viewingAsset}
        projectId={projectId}
        onOpenChange={(open) => {
          if (!open) setViewingAsset(null)
        }}
      />
    </Card>
  )
}
