import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
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
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useAuditLogs } from '../hooks/use-audit-logs'

const PAGE_SIZE = 20

export function AuditLogsPage() {
  const can = useCan()
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useAuditLogs(page, PAGE_SIZE)

  // Matches the backend route (automation-audit-logs.routes.ts), which
  // reuses the pre-existing "auditlogs" permission rather than "automation"
  // — audit visibility is a separate concern from general page access.
  if (!can('auditlogs')) return <ForbiddenError />

  const events = data?.items ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <Main className='space-y-6'>
      <PageHeader
        title='Audit Logs'
        description='Every connection, MCP server, and credential-access event across the platform.'
        breadcrumbs={[{ label: 'Automation' }, { label: 'Audit Logs' }]}
      />

      {isLoading && (
        <div className='flex h-40 items-center justify-center text-muted-foreground'>
          Loading audit logs...
        </div>
      )}

      {!isLoading && error && (
        <div className='flex h-40 items-center justify-center text-destructive'>
          Failed to load audit logs.
        </div>
      )}

      {!isLoading && !error && (
        <div className='space-y-4'>
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className='h-24 text-center text-muted-foreground'
                    >
                      No audit events yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Badge variant='outline'>{event.action}</Badge>
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {event.targetType} · {event.targetId}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {event.actorId}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {new Date(event.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className='flex items-center justify-between'>
            <p className='text-sm text-muted-foreground'>
              Page {data?.pagination.page ?? page} of {totalPages}
            </p>
            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='outline'
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </Main>
  )
}
