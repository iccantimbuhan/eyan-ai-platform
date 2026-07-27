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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useSchedulePublish, usePublishAsset } from '../../hooks/use-asset-publishing'
import type { AssetType, ReviewStatus } from '../../types/asset'
import { PLATFORM_OPTIONS } from '../../types/publishing'

interface PublishDialogProps {
  projectId: string
  assetType: AssetType
  sourceId: string
  status: ReviewStatus
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Scheduling is persisted intent only — no background execution exists
// (see ADR-0010). Choosing a future date/time here calls schedulePublish
// and stops; choosing none calls schedulePublish then immediately
// publish(), i.e. "Publish Now" composes the same two independent
// mutations RequestRevisionDialog already demonstrates for QA actions.
export function PublishDialog({
  projectId,
  assetType,
  sourceId,
  status,
  open,
  onOpenChange,
}: PublishDialogProps) {
  const [platform, setPlatform] = useState(PLATFORM_OPTIONS[0]?.value ?? '')
  const [scheduledFor, setScheduledFor] = useState('')
  const schedulePublish = useSchedulePublish(projectId)
  const publishAsset = usePublishAsset(projectId)

  const isApproved = status === 'APPROVED'
  const isPending = schedulePublish.isPending || publishAsset.isPending

  const reset = () => {
    setScheduledFor('')
  }

  const handleSubmit = () => {
    if (!platform) return

    if (scheduledFor) {
      schedulePublish.mutate(
        {
          assetType,
          sourceId,
          payload: { platform, scheduledFor: new Date(scheduledFor).toISOString() },
        },
        {
          onSuccess: () => {
            toast.success('Publishing scheduled.')
            reset()
            onOpenChange(false)
          },
          onError: () => toast.error('Failed to schedule publishing.'),
        }
      )
      return
    }

    schedulePublish.mutate(
      { assetType, sourceId, payload: { platform } },
      {
        onSuccess: () => {
          publishAsset.mutate(
            { assetType, sourceId, platform },
            {
              onSuccess: () => {
                toast.success('Asset published.')
                onOpenChange(false)
              },
              onError: () => toast.error('Publishing failed.'),
            }
          )
        },
        onError: () => toast.error('Failed to prepare publishing.'),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish this asset</DialogTitle>
          <DialogDescription>
            {isApproved
              ? 'Choose a platform, and optionally a future date/time to schedule instead of publishing immediately.'
              : 'This asset must be approved before it can be scheduled or published.'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='publish-platform'>Platform</Label>
            <Select value={platform} onValueChange={setPlatform} disabled={!isApproved}>
              <SelectTrigger id='publish-platform' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='publish-schedule'>Schedule for later (optional)</Label>
            <Input
              id='publish-schedule'
              type='datetime-local'
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={!isApproved}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isApproved || isPending || !platform}>
            {isPending ? 'Working...' : scheduledFor ? 'Schedule' : 'Publish Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
