import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

import { resolveImageUrl } from '../../api/images.api'
import { downloadAsset } from '../../lib/asset-export'
import { useAsset } from '../../hooks/use-asset'
import { useDeleteAsset } from '../../hooks/use-delete-asset'
import { useDuplicateAsset } from '../../hooks/use-duplicate-asset'
import { useRegenerateAsset } from '../../hooks/use-regenerate-asset'
import { useReviewAsset } from '../../hooks/use-review-asset'
import {
  ASSET_TYPE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  supportsRegeneration,
  type AssetDetail,
  type AssetSummary,
  type ChecklistItemValue,
  type ReviewStatus,
} from '../../types/asset'
import { AssetStatusBadge } from './AssetStatusBadge'
import { QaChecklist } from './QaChecklist'
import { VersionHistory } from './VersionHistory'

interface AssetDetailSheetProps {
  asset: AssetSummary | null
  projectId: string
  onOpenChange: (open: boolean) => void
}

function assetTypeLabel(assetType: AssetDetail['assetType']): string {
  return (
    ASSET_TYPE_OPTIONS.find((option) => option.value === assetType)?.label ??
    assetType
  )
}

export function AssetDetailSheet({
  asset,
  projectId,
  onOpenChange,
}: AssetDetailSheetProps) {
  return (
    <Sheet open={Boolean(asset)} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-full overflow-y-auto sm:max-w-xl'>
        {asset && (
          <AssetDetailBody
            key={`${asset.assetType}:${asset.id}`}
            assetType={asset.assetType}
            sourceId={asset.id}
            projectId={projectId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

interface AssetDetailBodyProps {
  assetType: AssetSummary['assetType']
  sourceId: string
  projectId: string
  onClose: () => void
}

function AssetDetailBody({
  assetType,
  sourceId,
  projectId,
  onClose,
}: AssetDetailBodyProps) {
  const { data: asset, isLoading, isError } = useAsset(assetType, sourceId)

  if (isLoading) {
    return (
      <div role='status' aria-label='Loading asset' className='space-y-4 p-4'>
        <Skeleton className='h-6 w-3/4' />
        <Skeleton className='h-32 w-full' />
        <Skeleton className='h-32 w-full' />
      </div>
    )
  }

  if (isError || !asset) {
    return (
      <div className='p-4'>
        <p className='text-sm text-destructive'>Failed to load asset.</p>
      </div>
    )
  }

  return <AssetDetailContent asset={asset} projectId={projectId} onClose={onClose} />
}

function AssetDetailContent({
  asset,
  projectId,
  onClose,
}: {
  asset: AssetDetail
  projectId: string
  onClose: () => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [status, setStatus] = useState<ReviewStatus>(asset.status)
  const [notes, setNotes] = useState(asset.notes ?? '')
  const [qaScore, setQaScore] = useState(asset.qaScore?.toString() ?? '')
  const [checklist, setChecklist] = useState<ChecklistItemValue[]>(asset.checklist ?? [])

  const reviewAsset = useReviewAsset(projectId)
  const duplicateAsset = useDuplicateAsset(projectId)
  const regenerateAsset = useRegenerateAsset(projectId)
  const deleteAsset = useDeleteAsset(projectId)

  const handleSaveReview = () => {
    reviewAsset.mutate(
      {
        assetType: asset.assetType,
        sourceId: asset.id,
        payload: {
          status,
          notes: notes.trim() || undefined,
          qaScore: qaScore ? Number(qaScore) : undefined,
          checklist,
        },
      },
      {
        onSuccess: () => toast.success('Review saved.'),
        onError: () => toast.error('Failed to save review.'),
      }
    )
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(asset.output ?? asset.prompt)
      toast.success('Copied to clipboard.')
    } catch {
      toast.error('Failed to copy asset content.')
    }
  }

  const handleDownload = async () => {
    try {
      await downloadAsset(asset)
    } catch {
      toast.error('Failed to download asset.')
    }
  }

  const handleDuplicate = () => {
    duplicateAsset.mutate(
      { assetType: asset.assetType, sourceId: asset.id },
      {
        onSuccess: () => toast.success('Asset duplicated.'),
        onError: () => toast.error('Failed to duplicate asset.'),
      }
    )
  }

  const handleRegenerate = () => {
    regenerateAsset.mutate(
      { assetType: asset.assetType, sourceId: asset.id },
      {
        onSuccess: () => toast.success('Asset regenerated.'),
        onError: () => toast.error('Failed to regenerate asset.'),
      }
    )
  }

  return (
    <>
      <SheetHeader>
        <div className='flex items-center gap-2'>
          <SheetTitle>{asset.title}</SheetTitle>
          <AssetStatusBadge status={asset.status} />
        </div>
        <SheetDescription>
          {assetTypeLabel(asset.assetType)} · {asset.projectName}
        </SheetDescription>
      </SheetHeader>

      <div className='space-y-6 px-4 pb-4'>
        {asset.assetType === 'IMAGE' && asset.thumbnailUrl && (
          <img
            src={resolveImageUrl(asset.thumbnailUrl)}
            alt={asset.title}
            className='w-full rounded-lg border'
          />
        )}

        <section className='space-y-2'>
          <h3 className='text-sm font-semibold'>General</h3>

          <dl className='space-y-2 text-sm'>
            <div>
              <dt className='text-muted-foreground'>Prompt</dt>
              <dd className='whitespace-pre-wrap'>{asset.prompt}</dd>
            </div>

            {asset.negativePrompt && (
              <div>
                <dt className='text-muted-foreground'>Negative Prompt</dt>
                <dd className='whitespace-pre-wrap'>{asset.negativePrompt}</dd>
              </div>
            )}

            {asset.output && asset.assetType !== 'IMAGE' && (
              <div>
                <dt className='text-muted-foreground'>Output</dt>
                <dd className='whitespace-pre-wrap'>{asset.output}</dd>
              </div>
            )}

            <div className='flex justify-between'>
              <dt className='text-muted-foreground'>Provider</dt>
              <dd>{asset.provider ?? '—'}</dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-muted-foreground'>Model</dt>
              <dd>{asset.model ?? '—'}</dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-muted-foreground'>Created</dt>
              <dd>{new Date(asset.createdAt).toLocaleString()}</dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-muted-foreground'>Updated</dt>
              <dd>{new Date(asset.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <section className='space-y-2'>
          <h3 className='text-sm font-semibold'>Metadata</h3>

          <dl className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <dt className='text-muted-foreground'>Generation Time</dt>
              <dd>
                {asset.generationTimeMs !== null
                  ? `${(asset.generationTimeMs / 1000).toFixed(1)}s`
                  : '—'}
              </dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-muted-foreground'>Asset Type</dt>
              <dd>{assetTypeLabel(asset.assetType)}</dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-muted-foreground'>Project</dt>
              <dd>{asset.projectName}</dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-muted-foreground'>Version</dt>
              <dd>v{asset.version}</dd>
            </div>
          </dl>
        </section>

        <section className='space-y-3'>
          <h3 className='text-sm font-semibold'>Quality Assurance</h3>

          <div className='space-y-2'>
            <Label htmlFor='asset-review-status'>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ReviewStatus)}>
              <SelectTrigger id='asset-review-status' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <QaChecklist assetType={asset.assetType} value={checklist} onChange={setChecklist} />

          <div className='space-y-2'>
            <Label htmlFor='asset-review-notes'>Reviewer Notes</Label>
            <Textarea
              id='asset-review-notes'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className='min-h-20'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='asset-review-score'>QA Score (0–100)</Label>
            <Input
              id='asset-review-score'
              type='number'
              min={0}
              max={100}
              value={qaScore}
              onChange={(e) => setQaScore(e.target.value)}
              className='w-24'
            />
          </div>

          {asset.reviewerName && (
            <p className='text-xs text-muted-foreground'>
              Last reviewed by {asset.reviewerName}
              {asset.reviewedAt
                ? ` on ${new Date(asset.reviewedAt).toLocaleString()}`
                : ''}
              .
            </p>
          )}

          <Button
            size='sm'
            onClick={handleSaveReview}
            disabled={reviewAsset.isPending}
          >
            {reviewAsset.isPending ? 'Saving...' : 'Save Review'}
          </Button>
        </section>

        <VersionHistory assetType={asset.assetType} sourceId={asset.id} />

        <section className='space-y-2'>
          <h3 className='text-sm font-semibold'>Actions</h3>

          <div className='flex flex-wrap gap-2'>
            <Button size='sm' variant='outline' onClick={handleDownload}>
              Download
            </Button>
            <Button size='sm' variant='outline' onClick={handleCopy}>
              Copy
            </Button>
            <Button size='sm' variant='outline' onClick={handleDuplicate}>
              Duplicate
            </Button>
            {supportsRegeneration(asset.assetType) && (
              <Button
                size='sm'
                variant='outline'
                onClick={handleRegenerate}
                disabled={regenerateAsset.isPending}
              >
                {regenerateAsset.isPending ? 'Regenerating...' : 'Regenerate'}
              </Button>
            )}
            <Button
              size='sm'
              variant='outline'
              className='text-destructive'
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Delete this asset?'
        desc={`This will permanently delete "${asset.title}". This can't be undone.`}
        destructive
        confirmText='Delete'
        isLoading={deleteAsset.isPending}
        handleConfirm={() => {
          deleteAsset.mutate(
            { assetType: asset.assetType, sourceId: asset.id },
            {
              onSuccess: () => {
                setDeleteOpen(false)
                toast.success('Asset deleted.')
                onClose()
              },
              onError: () => toast.error('Failed to delete asset.'),
            }
          )
        }}
      />
    </>
  )
}
