import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useUsers } from '@/features/users/hooks/use-users'
import { useAssignReviewer, useUnassignReviewer } from '../../hooks/use-asset-assignment'
import type { AssetType } from '../../types/asset'

interface AssigneePickerProps {
  projectId: string
  assetType: AssetType
  sourceId: string
  assignee: { id: string; name: string } | null
}

// Informational only — assigning a reviewer records intent for review
// planning/queue organization/timeline history. It does not grant the
// assignee any access to the project; the project owner remains the only
// user who can view or act on it. See ADR-0009.
export function AssigneePicker({
  projectId,
  assetType,
  sourceId,
  assignee,
}: AssigneePickerProps) {
  const { data: users } = useUsers()
  const [note, setNote] = useState('')
  const assignReviewer = useAssignReviewer(projectId)
  const unassignReviewer = useUnassignReviewer(projectId)

  const handleAssign = (assigneeId: string) => {
    assignReviewer.mutate(
      { assetType, sourceId, payload: { assigneeId, note: note.trim() || undefined } },
      {
        onSuccess: () => toast.success('Reviewer assigned.'),
        onError: () => toast.error('Failed to assign reviewer.'),
      }
    )
  }

  const handleUnassign = () => {
    unassignReviewer.mutate(
      { assetType, sourceId },
      {
        onSuccess: () => toast.success('Reviewer unassigned.'),
        onError: () => toast.error('Failed to unassign reviewer.'),
      }
    )
  }

  return (
    <div className='space-y-2'>
      {assignee ? (
        <div className='flex items-center justify-between gap-2 text-sm'>
          <span>
            Assigned to <span className='font-medium'>{assignee.name}</span>
          </span>
          <Button
            size='sm'
            variant='outline'
            onClick={handleUnassign}
            disabled={unassignReviewer.isPending}
          >
            Unassign
          </Button>
        </div>
      ) : (
        <div className='flex flex-wrap items-center gap-2'>
          <Select onValueChange={handleAssign} disabled={assignReviewer.isPending}>
            <SelectTrigger className='w-full sm:w-56'>
              <SelectValue placeholder='Assign a reviewer' />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder='Note (optional)'
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className='w-full sm:w-48'
          />
        </div>
      )}
    </div>
  )
}
