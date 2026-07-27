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
import { useCheckMcpServerHealth, useMcpServers } from '../hooks/use-mcp-servers'
import { HealthStatusBadge } from '../lib/status-badges'

// Deliberately reuses useMcpServers() rather than a separate fetch — health
// fields (healthStatus/lastHealthCheckAt/lastHealthMessage) already live on
// every McpServerConfig row returned by GET /mcp-servers, so a second data
// source here would just be the same data shaped twice.
export function HealthPage() {
  const can = useCan()
  const { data: servers = [], isLoading, error } = useMcpServers()
  const checkHealth = useCheckMcpServerHealth()

  if (!can('automation')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Health</h1>
        <p className='text-muted-foreground'>
          Connectivity status for every registered MCP server.
        </p>
      </div>

      {isLoading && (
        <div className='flex h-40 items-center justify-center text-muted-foreground'>
          Loading health status...
        </div>
      )}

      {!isLoading && error && (
        <div className='flex h-40 items-center justify-center text-destructive'>
          Failed to load health status.
        </div>
      )}

      {!isLoading && !error && (
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Server</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className='w-32' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                    No MCP servers registered yet — register one on the MCP Servers page.
                  </TableCell>
                </TableRow>
              ) : (
                servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className='font-medium'>{server.name}</TableCell>
                    <TableCell>
                      <HealthStatusBadge status={server.healthStatus} />
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {server.lastHealthCheckAt
                        ? new Date(server.lastHealthCheckAt).toLocaleString()
                        : 'Never checked'}
                    </TableCell>
                    <TableCell className='max-w-72 truncate text-muted-foreground'>
                      {server.lastHealthMessage ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size='sm'
                        variant='outline'
                        disabled={checkHealth.isPending}
                        onClick={() => checkHealth.mutate(server.id)}
                      >
                        Check Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Main>
  )
}
