import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'

import { useAddComment, useAssetComments } from '../../hooks/use-asset-comments'
import type { AssetType } from '../../types/asset'

interface ImageAnnotationOverlayProps {
  projectId: string
  assetType: AssetType
  sourceId: string
  imageUrl: string
  alt: string
}

interface DraftRegion {
  x: number
  y: number
  width: number
  height: number
}

// Draws normalized (0-1) rectangles over an image via plain absolutely-
// positioned divs — no canvas library needed for rectangles-only markup.
// Existing region comments render as overlaid boxes; a click-drag on the
// image starts a new one.
export function ImageAnnotationOverlay({
  projectId,
  assetType,
  sourceId,
  imageUrl,
  alt,
}: ImageAnnotationOverlayProps) {
  const { data: comments } = useAssetComments(assetType, sourceId)
  const addComment = useAddComment(projectId)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [draft, setDraft] = useState<DraftRegion | null>(null)
  const [body, setBody] = useState('')

  const regionComments = (comments ?? []).filter((comment) => comment.region)

  const pointFromEvent = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }

    return {
      x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
      y: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart(pointFromEvent(e))
    setDraft(null)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart) return

    const point = pointFromEvent(e)
    setDraft({
      x: Math.min(dragStart.x, point.x),
      y: Math.min(dragStart.y, point.y),
      width: Math.abs(point.x - dragStart.x),
      height: Math.abs(point.y - dragStart.y),
    })
  }

  const handleMouseUp = () => {
    setDragStart(null)
    if (draft && (draft.width < 0.01 || draft.height < 0.01)) {
      setDraft(null)
    }
  }

  const handleSubmit = () => {
    if (!draft || !body.trim()) return

    addComment.mutate(
      { assetType, sourceId, payload: { body: body.trim(), region: draft } },
      {
        onSuccess: () => {
          setDraft(null)
          setBody('')
        },
        onError: () => toast.error('Failed to add annotation.'),
      }
    )
  }

  return (
    <div
      ref={containerRef}
      className='relative w-full select-none overflow-hidden rounded-lg border'
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <img src={imageUrl} alt={alt} className='w-full' draggable={false} />

      {regionComments.map((comment) => (
        <div
          key={comment.id}
          className='absolute border-2 border-primary bg-primary/10'
          style={{
            left: `${(comment.region?.x ?? 0) * 100}%`,
            top: `${(comment.region?.y ?? 0) * 100}%`,
            width: `${(comment.region?.width ?? 0) * 100}%`,
            height: `${(comment.region?.height ?? 0) * 100}%`,
          }}
          title={comment.body}
        />
      ))}

      {draft && (
        <Popover open onOpenChange={(open) => !open && setDraft(null)}>
          <PopoverTrigger asChild>
            <div
              className='absolute border-2 border-dashed border-primary bg-primary/20'
              style={{
                left: `${draft.x * 100}%`,
                top: `${draft.y * 100}%`,
                width: `${draft.width * 100}%`,
                height: `${draft.height * 100}%`,
              }}
            />
          </PopoverTrigger>
          <PopoverContent className='space-y-2'>
            <Textarea
              autoFocus
              placeholder='What needs attention here?'
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className='min-h-16'
            />
            <div className='flex justify-end gap-2'>
              <Button size='sm' variant='outline' onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button
                size='sm'
                onClick={handleSubmit}
                disabled={addComment.isPending || !body.trim()}
              >
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
