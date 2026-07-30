import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

import { useAuthStore } from '@/stores/auth-store'
import { useAssets } from '../../hooks/use-assets'
import { useReviewAsset } from '../../hooks/use-review-asset'
import {
  ASSET_TYPE_OPTIONS,
  type AssetSummary,
  type ReviewStatus,
} from '../../types/asset'
import { AssetDetailSheet } from './AssetDetailSheet'
import { AssetPagination } from './AssetPagination'
import { AssetStatusBadge } from './AssetStatusBadge'

const REVIEW_QUEUE_FILTERS: { value: ReviewStatus; label: string }[] = [
  { value: 'NEEDS_REVIEW', label: 'Needs Review' },
  { value: 'REVISION_REQUESTED', label: 'Revision Requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PUBLISHED', label: 'Published' },
]

const PAGE_SIZE = 20

function assetTypeLabel(assetType: AssetSummary['assetType']): string {
  return (
    ASSET_TYPE_OPTIONS.find((option) => option.value === assetType)?.label ??
    assetType
  )
}

interface ReviewQueueProps {
  projectId: string
}

// Deliberately scoped to this project this sprint (per the requirements
// discussion) — but built on the exact same useAssets(projectId, filters)
// hook and AssetSummary data as AssetLibrary, with only the status filter
// and row density differing. Promoting this to a global, cross-project
// queue later is a matter of making projectId optional here and in the
// backend's listAssetsValidator, not a rewrite. See docs/ASSET_LIBRARY.md.
export function ReviewQueue({ projectId }: ReviewQueueProps) {
  const [status, setStatus] = useState<ReviewStatus>('NEEDS_REVIEW')
  const [page, setPage] = useState(1)
  const [viewingAsset, setViewingAsset] = useState<AssetSummary | null>(null)
  const [notesTarget, setNotesTarget] = useState<AssetSummary | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const currentUserId = useAuthStore((state) => state.auth.user?.id)

  // Reset to page 1 whenever the status filter changes — a synchronous
  // setState during render (React's "adjusting state when a prop changes"
  // pattern), not inside an effect, to avoid a cascading second render.
  const [appliedStatus, setAppliedStatus] = useState(status)
  if (status !== appliedStatus) {
    setAppliedStatus(status)
    setPage(1)
  }

  const assets = useAssets(projectId, { status, page, pageSize: PAGE_SIZE })
  const reviewAsset = useReviewAsset(projectId)

  const items = mineOnly
    ? (assets.data?.items ?? []).filter((item) => item.assignee?.id === currentUserId)
    : (assets.data?.items ?? [])

  function updateStatus(item: AssetSummary, next: ReviewStatus) {
    reviewAsset.mutate(
      { assetType: item.assetType, sourceId: item.id, payload: { status: next } },
      {
        onSuccess: () =>
          toast.success(next === 'APPROVED' ? 'Approved.' : 'Rejected.'),
        onError: () => toast.error('Failed to update status.'),
      }
    )
  }

  function saveNotes() {
    if (!notesTarget) return

    reviewAsset.mutate(
      { assetType: notesTarget.assetType, sourceId: notesTarget.id, payload: { notes: notesDraft } },
      {
        onSuccess: () => {
          toast.success('Notes saved.')
          setNotesTarget(null)
        },
        onError: () => toast.error('Failed to save notes.'),
      }
    )
  }

  return (
    <Card data-presentation-target='content-studio.workspace.review.queue'>
      <CardContent className='space-y-4 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <Tabs value={status} onValueChange={(value) => setStatus(value as ReviewStatus)}>
            <TabsList>
              {REVIEW_QUEUE_FILTERS.map((filter) => (
                <TabsTrigger key={filter.value} value={filter.value}>
                  {filter.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <label className='flex items-center gap-2 text-sm'>
            <Checkbox
              checked={mineOnly}
              onCheckedChange={(checked) => setMineOnly(checked === true)}
            />
            My assignments
          </label>
        </div>

        {assets.isLoading && (
          <div role='status' aria-label='Loading review queue' className='space-y-3'>
            <Skeleton className='h-16 w-full' />
            <Skeleton className='h-16 w-full' />
          </div>
        )}

        {assets.isError && (
          <p className='text-sm text-destructive'>
            Failed to load the review queue. Try refreshing the page.
          </p>
        )}

        {!assets.isLoading && !assets.isError && assets.data && items.length === 0 && (
          <div className='flex flex-col items-center justify-center gap-2 py-12 text-center'>
            <ClipboardCheck className='h-8 w-8 text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>
              Nothing here — the queue is empty for this status.
            </p>
          </div>
        )}

        {!assets.isLoading && !assets.isError && assets.data && items.length > 0 && (
          <>
            <div className='space-y-2'>
              {items.map((item) => (
                <div
                  key={`${item.assetType}:${item.id}`}
                  className='flex flex-wrap items-center justify-between gap-3 rounded-md border p-3'
                >
                  <div className='min-w-0 space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge variant='outline'>{assetTypeLabel(item.assetType)}</Badge>
                      <AssetStatusBadge status={item.status} />
                      {item.assignee && (
                        <Badge variant='secondary'>Assigned: {item.assignee.name}</Badge>
                      )}
                      {item.openCommentCount > 0 && (
                        <Badge variant='outline'>{item.openCommentCount} comment(s)</Badge>
                      )}
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

                  <div className='flex shrink-0 flex-wrap gap-1'>
                    <Button size='sm' variant='outline' onClick={() => setViewingAsset(item)}>
                      Open
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => updateStatus(item, 'APPROVED')}
                      disabled={reviewAsset.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => updateStatus(item, 'REJECTED')}
                      disabled={reviewAsset.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        setNotesTarget(item)
                        setNotesDraft('')
                      }}
                    >
                      Add Notes
                    </Button>
                  </div>
                </div>
              ))}
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

      <Dialog
        open={Boolean(notesTarget)}
        onOpenChange={(open) => {
          if (!open) setNotesTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notes</DialogTitle>
          </DialogHeader>

          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder='Reviewer notes...'
            className='min-h-24'
          />

          <DialogFooter>
            <Button onClick={saveNotes} disabled={reviewAsset.isPending}>
              {reviewAsset.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
