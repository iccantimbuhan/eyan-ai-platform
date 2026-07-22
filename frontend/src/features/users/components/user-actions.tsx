import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { EditUserDialog } from './edit-user-dialog'
import { DeleteUserDialog } from './delete-user-dialog'

import type { User } from '../types/user'

type UserActionsProps = {
  user: User
}

export function UserActions({
  user,
}: UserActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setEditOpen(true)}
          >
            Edit User
          </DropdownMenuItem>

          <DropdownMenuItem>
            Reset Password
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog
        user={user}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteUserDialog
        userId={user.id}
        userName={user.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
