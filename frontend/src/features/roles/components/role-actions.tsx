import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteRole } from '../hooks/use-roles'
import type { Role } from '../types/role'
import { RoleDialog } from './role-dialog'

export function RoleActions({ role }: { role: Role }) {
  const [mode, setMode] = useState<'edit' | 'view' | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const remove = useDeleteRole()
  const handleDelete = async () => {
    await remove.mutateAsync(role.id)
    setDeleteOpen(false)
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={() => setMode('view')}>
            View Role
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMode('edit')}>
            Edit Role
          </DropdownMenuItem>
          <DropdownMenuItem
            className='text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            Delete Role
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RoleDialog
        role={role}
        mode={mode ?? 'view'}
        open={mode !== null}
        onOpenChange={(open) => !open && setMode(null)}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{' '}
              <strong>{role.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {remove.isPending ? 'Deleting...' : 'Delete Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
