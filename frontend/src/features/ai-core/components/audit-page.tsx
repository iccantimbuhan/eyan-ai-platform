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
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useAiAuditLogs } from '../hooks/use-ai-audit-logs'

export function AiAuditPage() {
  const can = useCan()
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useAiAuditLogs(page, 20)

  if (!can('auditlogs')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <PageHeader
        title='Audit Logs'
        description='Append-only security/config trail for AI Core — Brains, Capabilities, credentials, routing, prompts.'
        breadcrumbs={[
          { label: 'AI Core', to: '/app/ai-core' },
          { label: 'Audit Logs' },
        ]}
      />

      {isLoading && (
        <div className='flex h-40 items-center justify-center text-muted-foreground'>
          Loading...
        </div>
      )}
      {!isLoading && error && (
        <div className='flex h-40 items-center justify-center text-destructive'>
          Failed to load audit log.
        </div>
      )}

      {!isLoading && !error && data && (
        <>
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
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className='h-24 text-center text-muted-foreground'
                    >
                      No audit events yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className='font-mono text-xs'>
                        {event.action}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {event.targetType} · {event.targetId}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {event.actorId ?? 'system'}
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
            <span className='text-sm text-muted-foreground'>
              Page {data.pagination.page} of{' '}
              {Math.max(data.pagination.totalPages, 1)}
            </span>
            <div className='space-x-2'>
              <Button
                size='sm'
                variant='outline'
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </Main>
  )
}
