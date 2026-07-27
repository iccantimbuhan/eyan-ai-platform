import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

import { useAddComment } from '../../hooks/use-asset-comments'
import { useReviewAsset } from '../../hooks/use-review-asset'
import type { AssetType } from '../../types/asset'

interface RequestRevisionDialogProps {
  projectId: string
  assetType: AssetType
  sourceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Two independent calls from one button — records the reason as a comment
// (preserved even as AssetReview.notes gets overwritten by later reviews),
// then sets status via the same PATCH .../review endpoint every other
// status change already uses. Matches AssetDetailSheet's existing pattern
// of composing several independent mutations rather than one combined
// backend action.
export function RequestRevisionDialog({
  projectId,
  assetType,
  sourceId,
  open,
  onOpenChange,
}: RequestRevisionDialogProps) {
  const [reason, setReason] = useState('')
  const addComment = useAddComment(projectId)
  const reviewAsset = useReviewAsset(projectId)

  const isPending = addComment.isPending || reviewAsset.isPending

  const handleSubmit = () => {
    if (!reason.trim()) return

    addComment.mutate(
      { assetType, sourceId, payload: { body: reason.trim() } },
      {
        onSuccess: () => {
          reviewAsset.mutate(
            { assetType, sourceId, payload: { status: 'REVISION_REQUESTED' } },
            {
              onSuccess: () => {
                toast.success('Revision requested.')
                setReason('')
                onOpenChange(false)
              },
              onError: () => toast.error('Failed to update status.'),
            }
          )
        },
        onError: () => toast.error('Failed to record the revision reason.'),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a revision</DialogTitle>
          <DialogDescription>
            Describe what needs to change. This becomes a comment on the asset and moves
            it to Revision Requested.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          placeholder='What needs to change?'
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className='min-h-24'
        />

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !reason.trim()}>
            {isPending ? 'Submitting...' : 'Request Revision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
