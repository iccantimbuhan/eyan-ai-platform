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
import { useCheckMcpServerHealth, useDeleteMcpServer } from '../hooks/use-mcp-servers'
import { McpServerDialog } from './mcp-server-dialog'
import type { McpServerConfig } from '../types/automation'

export function McpServerActions({ server }: { server: McpServerConfig }) {
  const can = useCan()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const checkHealth = useCheckMcpServerHealth()
  const remove = useDeleteMcpServer()

  const handleDelete = async () => {
    await remove.mutateAsync(server.id)
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
          <DropdownMenuItem onClick={() => checkHealth.mutate(server.id)}>
            Check Health
          </DropdownMenuItem>
          {can('automationcredentials') && (
            <>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive'
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {can('automationcredentials') && (
        <>
          <McpServerDialog
            mode='edit'
            server={server}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title='Remove MCP Server'
            desc={
              <>
                Are you sure you want to permanently remove{' '}
                <strong>{server.name}</strong>? This action cannot be undone.
              </>
            }
            destructive
            isLoading={remove.isPending}
            confirmText='Remove'
            handleConfirm={() => void handleDelete()}
          />
        </>
      )}
    </>
  )
}
