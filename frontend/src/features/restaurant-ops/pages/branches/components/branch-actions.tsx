import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Branch } from '../../../types/restaurant-ops'
import { BranchDialog } from './branch-dialog'
import { DeleteBranchDialog } from './delete-branch-dialog'

type BranchActionsProps = {
  branch: Branch
}

export function BranchActions({ branch }: BranchActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>

          <DropdownMenuItem className='text-destructive' onClick={() => setDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BranchDialog
        branch={branch}
        restaurantId={branch.restaurantId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteBranchDialog branchId={branch.id} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}
