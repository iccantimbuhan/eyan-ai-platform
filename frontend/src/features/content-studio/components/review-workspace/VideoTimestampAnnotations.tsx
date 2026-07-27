import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { useAddComment, useAssetComments } from '../../hooks/use-asset-comments'
import type { AssetType } from '../../types/asset'

interface VideoTimestampAnnotationsProps {
  projectId: string
  assetType: AssetType
  sourceId: string
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// A manually-entered logical marker (mm:ss), not synced to a video player —
// no real video file exists to sync playback against, the same scope
// simplification already documented for SUBTITLES/CAPTIONS timing in
// Sprint 6.2. See ADR-0009.
export function VideoTimestampAnnotations({
  projectId,
  assetType,
  sourceId,
}: VideoTimestampAnnotationsProps) {
  const { data: comments } = useAssetComments(assetType, sourceId)
  const addComment = useAddComment(projectId)
  const [timestamp, setTimestamp] = useState('')
  const [body, setBody] = useState('')

  const annotations = (comments ?? [])
    .filter((comment) => comment.timestampMs !== null)
    .sort((a, b) => (a.timestampMs ?? 0) - (b.timestampMs ?? 0))

  const handleSubmit = () => {
    const [minutesPart, secondsPart] = timestamp.split(':')
    const minutes = Number(minutesPart)
    const seconds = Number(secondsPart)

    if (!body.trim() || Number.isNaN(minutes) || Number.isNaN(seconds)) {
      toast.error('Enter a timestamp as mm:ss.')
      return
    }

    const timestampMs = (minutes * 60 + seconds) * 1000

    addComment.mutate(
      { assetType, sourceId, payload: { body: body.trim(), timestampMs } },
      {
        onSuccess: () => {
          setTimestamp('')
          setBody('')
        },
        onError: () => toast.error('Failed to add annotation.'),
      }
    )
  }

  return (
    <div className='space-y-3'>
      {annotations.length === 0 && (
        <p className='text-sm text-muted-foreground'>No timestamp annotations yet.</p>
      )}

      <ul className='space-y-2'>
        {annotations.map((comment) => (
          <li key={comment.id} className='flex items-start gap-2 rounded-md border p-2 text-sm'>
            <Badge variant='outline'>{formatTimestamp(comment.timestampMs ?? 0)}</Badge>
            <div>
              <p className='font-medium'>{comment.authorName}</p>
              <p className='whitespace-pre-wrap'>{comment.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className='flex flex-wrap items-start gap-2'>
        <Input
          placeholder='mm:ss'
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          className='w-20'
        />
        <Textarea
          placeholder='What happens at this point?'
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className='min-h-10 flex-1'
        />
        <Button
          size='sm'
          onClick={handleSubmit}
          disabled={addComment.isPending || !body.trim() || !timestamp.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  )
}
