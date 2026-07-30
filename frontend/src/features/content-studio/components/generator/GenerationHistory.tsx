import { useState } from 'react'

import { History, Trash2 } from 'lucide-react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { useContent } from '../../hooks/use-content'
import { useDeleteContent } from '../../hooks/use-delete-content'
import { CONTENT_TYPE_OPTIONS, type GeneratedContentItem } from '../../types/content'

interface GenerationHistoryProps {
  projectId: string
}

function typeLabel(type: string) {
  return (
    CONTENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type
  )
}

const PREVIEW_LENGTH = 280

function GenerationHistoryItem({
  item,
  onDeleteRequest,
  isDeleting,
}: {
  item: GeneratedContentItem
  onDeleteRequest: (item: GeneratedContentItem) => void
  isDeleting: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const isLong = item.output.length > PREVIEW_LENGTH
  const displayedOutput =
    expanded || !isLong ? item.output : `${item.output.slice(0, PREVIEW_LENGTH)}...`

  return (
    <div className='rounded-lg border p-4'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0 space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline'>{typeLabel(item.type)}</Badge>

            <span className='text-xs text-muted-foreground'>
              {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>

          <p className='text-sm font-medium break-words'>{item.prompt}</p>
        </div>

        <Button
          variant='ghost'
          size='icon'
          className='shrink-0'
          aria-label='Delete generated content'
          disabled={isDeleting}
          onClick={() => onDeleteRequest(item)}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>

      <p className='mt-2 whitespace-pre-wrap text-sm text-muted-foreground'>
        {displayedOutput}
      </p>

      {isLong && (
        <Button
          variant='link'
          size='sm'
          className='h-auto px-0'
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </div>
  )
}

export function GenerationHistory({ projectId }: GenerationHistoryProps) {
  const { data, isLoading, isError } = useContent(projectId)
  const deleteContent = useDeleteContent(projectId)
  const [deleteTarget, setDeleteTarget] = useState<GeneratedContentItem | null>(
    null
  )

  return (
    <Card data-presentation-target='content-studio.workspace.content.history'>
      <CardHeader>
        <CardTitle>Generation History</CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div
            role='status'
            aria-label='Loading generation history'
            className='space-y-3'
          >
            <Skeleton className='h-20 w-full' />
            <Skeleton className='h-20 w-full' />
          </div>
        )}

        {isError && (
          <p className='text-sm text-destructive'>
            Failed to load generation history. Try refreshing the page.
          </p>
        )}

        {!isLoading && !isError && data?.items.length === 0 && (
          <div className='flex flex-col items-center justify-center gap-2 py-8 text-center'>
            <History className='h-8 w-8 text-muted-foreground' />

            <p className='text-sm text-muted-foreground'>
              No content generated yet for this project.
            </p>
          </div>
        )}

        {!isLoading && !isError && data && data.items.length > 0 && (
          <div className='space-y-4'>
            {data.items.map((item) => (
              <GenerationHistoryItem
                key={item.id}
                item={item}
                onDeleteRequest={setDeleteTarget}
                isDeleting={deleteContent.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title='Delete generated content?'
        desc={
          deleteTarget
            ? `This will permanently delete this ${typeLabel(deleteTarget.type).toLowerCase()} content. This can't be undone.`
            : ''
        }
        destructive
        confirmText='Delete'
        isLoading={deleteContent.isPending}
        handleConfirm={() => {
          if (!deleteTarget) return

          deleteContent.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
      />
    </Card>
  )
}
