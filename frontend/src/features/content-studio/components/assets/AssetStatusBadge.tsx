import { RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { REVIEW_STATUS_OPTIONS, type ReviewStatus } from '../../types/asset'

interface Props {
  status: ReviewStatus
}

function statusLabel(status: ReviewStatus): string {
  return (
    REVIEW_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  )
}

export function AssetStatusBadge({ status }: Props) {
  switch (status) {
    case 'PUBLISHED':
      return <Badge>{statusLabel(status)}</Badge>

    case 'APPROVED':
      return <Badge variant='secondary'>{statusLabel(status)}</Badge>

    case 'REJECTED':
      return <Badge variant='destructive'>{statusLabel(status)}</Badge>

    case 'NEEDS_REVIEW':
      return <Badge variant='outline'>{statusLabel(status)}</Badge>

    case 'REVISION_REQUESTED':
      return (
        <Badge variant='outline' className='gap-1'>
          <RotateCcw className='size-3' />
          {statusLabel(status)}
        </Badge>
      )

    default:
      return <Badge variant='outline'>{statusLabel(status)}</Badge>
  }
}
