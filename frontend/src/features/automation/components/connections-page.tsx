import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useConnections } from '../hooks/use-connections'
import { ConnectionStatusBadge } from '../lib/status-badges'
import { ConnectionActions } from './connection-actions'
import { ConnectionDialog } from './connection-dialog'

export function ConnectionsPage() {
  const can = useCan()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: connections = [], isLoading, error } = useConnections()

  if (!can('automation')) return <ForbiddenError />

  return (
    <>
      <Main className='space-y-6'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Connections</h1>
            <p className='text-muted-foreground'>
              Encrypted credentials for MCP providers. Raw credential values
              are never shown here or returned by the API.
            </p>
          </div>
          {can('automationcredentials') && (
            <Button onClick={() => setCreateOpen(true)}>New Connection</Button>
          )}
        </div>

        {isLoading && (
          <div className='flex h-40 items-center justify-center text-muted-foreground'>
            Loading connections...
          </div>
        )}

        {!isLoading && error && (
          <div className='flex h-40 items-center justify-center text-destructive'>
            Failed to load connections.
          </div>
        )}

        {!isLoading && !error && (
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Verified</TableHead>
                  <TableHead className='w-12' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                      No connections yet. Create one to store a credential for an MCP provider.
                    </TableCell>
                  </TableRow>
                ) : (
                  connections.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell className='font-medium'>{connection.label}</TableCell>
                      <TableCell className='capitalize'>{connection.provider}</TableCell>
                      <TableCell>
                        <ConnectionStatusBadge status={connection.status} />
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {connection.lastVerifiedAt
                          ? new Date(connection.lastVerifiedAt).toLocaleString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <ConnectionActions connection={connection} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Main>
      <ConnectionDialog mode='create' open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
