import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useCan } from '@/features/auth/hooks/use-can'
import {
  useDeleteConnection,
  useDisableConnection,
  useEnableConnection,
} from '../hooks/use-connections'
import { ConnectionDialog } from './connection-dialog'
import { RotateCredentialsDialog } from './rotate-credentials-dialog'
import type { AutomationConnection } from '../types/automation'

export function ConnectionActions({ connection }: { connection: AutomationConnection }) {
  const can = useCan()
  const [editOpen, setEditOpen] = useState(false)
  const [rotateOpen, setRotateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const enable = useEnableConnection()
  const disable = useDisableConnection()
  const remove = useDeleteConnection()

  // Mutating a credential-bearing resource requires the stricter
  // "automationcredentials" permission — a caller with only "automation"
  // can see connections (redacted) but gets no actions here at all.
  if (!can('automationcredentials')) return null

  const handleDelete = async () => {
    await remove.mutateAsync(connection.id)
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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit Label
          </DropdownMenuItem>
          {connection.status === 'ACTIVE' ? (
            <DropdownMenuItem onClick={() => disable.mutate(connection.id)}>
              Disable
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => enable.mutate(connection.id)}>
              Enable
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setRotateOpen(true)}>
            Rotate Credentials
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className='text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConnectionDialog
        mode='edit'
        connection={connection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <RotateCredentialsDialog
        connection={connection}
        open={rotateOpen}
        onOpenChange={setRotateOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Delete Connection'
        desc={
          <>
            Are you sure you want to permanently delete{' '}
            <strong>{connection.label}</strong>? This action cannot be undone.
          </>
        }
        destructive
        isLoading={remove.isPending}
        confirmText='Delete'
        handleConfirm={() => void handleDelete()}
      />
    </>
  )
}
