import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

import {
  useAddComment,
  useAssetComments,
  useResolveComment,
} from '../../hooks/use-asset-comments'
import type { AssetType } from '../../types/asset'
import type { AssetComment } from '../../types/review-workspace'

interface CommentThreadProps {
  projectId: string
  assetType: AssetType
  sourceId: string
  // General comments only by default — pass 'annotations' from the image/
  // video overlay panels to show just the anchored subset instead.
  filter?: 'general' | 'annotations'
}

function anchorLabel(comment: AssetComment): string | null {
  if (comment.region) return 'Region'
  if (comment.timestampMs !== null) {
    const totalSeconds = Math.floor(comment.timestampMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  return null
}

export function CommentThread({
  projectId,
  assetType,
  sourceId,
  filter = 'general',
}: CommentThreadProps) {
  const { data: comments, isLoading, isError } = useAssetComments(assetType, sourceId)
  const [body, setBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const addComment = useAddComment(projectId)
  const resolveComment = useResolveComment(projectId)

  const visible = (comments ?? []).filter((comment) =>
    filter === 'general'
      ? !comment.region && comment.timestampMs === null
      : Boolean(comment.region) || comment.timestampMs !== null
  )

  const handleSubmit = () => {
    if (!body.trim()) return

    addComment.mutate(
      { assetType, sourceId, payload: { body: body.trim(), isInternal } },
      {
        onSuccess: () => {
          setBody('')
          setIsInternal(false)
        },
        onError: () => toast.error('Failed to add comment.'),
      }
    )
  }

  const handleResolve = (commentId: string) => {
    resolveComment.mutate(
      { assetType, sourceId, commentId },
      { onError: () => toast.error('Failed to resolve comment.') }
    )
  }

  if (isLoading) {
    return (
      <div role='status' aria-label='Loading comments' className='space-y-2'>
        <Skeleton className='h-10 w-full' />
      </div>
    )
  }

  if (isError) {
    return <p className='text-sm text-destructive'>Failed to load comments.</p>
  }

  return (
    <div className='space-y-3'>
      {visible.length === 0 && (
        <p className='text-sm text-muted-foreground'>No comments yet.</p>
      )}

      <ul className='space-y-2'>
        {visible.map((comment) => (
          <li key={comment.id} className='space-y-1 rounded-md border p-2 text-sm'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='font-medium'>{comment.authorName}</span>
              {comment.isInternal && <Badge variant='outline'>Internal</Badge>}
              {anchorLabel(comment) && (
                <Badge variant='outline'>{anchorLabel(comment)}</Badge>
              )}
              {comment.resolvedAt && <Badge variant='secondary'>Resolved</Badge>}
              <span className='text-xs text-muted-foreground'>
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <p className='whitespace-pre-wrap'>{comment.body}</p>
            {!comment.resolvedAt && (
              <Button
                size='sm'
                variant='ghost'
                onClick={() => handleResolve(comment.id)}
                disabled={resolveComment.isPending}
              >
                Resolve
              </Button>
            )}
          </li>
        ))}
      </ul>

      {filter === 'general' && (
        <div className='space-y-2'>
          <Textarea
            placeholder='Add a comment...'
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className='min-h-16'
          />
          <div className='flex items-center justify-between'>
            <label className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(checked === true)}
              />
              Internal only
            </label>
            <Button
              size='sm'
              onClick={handleSubmit}
              disabled={addComment.isPending || !body.trim()}
            >
              {addComment.isPending ? 'Posting...' : 'Comment'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
