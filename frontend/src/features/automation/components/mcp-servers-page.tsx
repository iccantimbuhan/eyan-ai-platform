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
import { useMcpServers } from '../hooks/use-mcp-servers'
import { HealthStatusBadge } from '../lib/status-badges'
import { McpServerActions } from './mcp-server-actions'
import { McpServerDialog } from './mcp-server-dialog'

export function McpServersPage() {
  const can = useCan()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: servers = [], isLoading, error } = useMcpServers()

  if (!can('automation')) return <ForbiddenError />

  return (
    <>
      <Main className='space-y-6'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>MCP Servers</h1>
            <p className='text-muted-foreground'>
              Registered MCP server instances and their configuration.
            </p>
          </div>
          {can('automationcredentials') && (
            <Button onClick={() => setCreateOpen(true)}>Register Server</Button>
          )}
        </div>

        {isLoading && (
          <div className='flex h-40 items-center justify-center text-muted-foreground'>
            Loading MCP servers...
          </div>
        )}

        {!isLoading && error && (
          <div className='flex h-40 items-center justify-center text-destructive'>
            Failed to load MCP servers.
          </div>
        )}

        {!isLoading && !error && (
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className='w-12' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='h-24 text-center text-muted-foreground'>
                      No MCP servers registered yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  servers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell className='font-medium'>{server.name}</TableCell>
                      <TableCell className='capitalize'>{server.provider}</TableCell>
                      <TableCell>{server.transport}</TableCell>
                      <TableCell>{server.isEnabled ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <HealthStatusBadge status={server.healthStatus} />
                      </TableCell>
                      <TableCell>
                        <McpServerActions server={server} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Main>
      <McpServerDialog mode='create' open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
