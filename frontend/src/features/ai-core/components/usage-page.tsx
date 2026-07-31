import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useUsage } from '../hooks/use-usage'
import { AiOutcomeBadge } from '../lib/status-badges'

// Reads from AiUsageLog filtered to domain="ai-core" only — Playground
// traffic never appears here (TDD §13, §17).
export function UsagePage() {
  const can = useCan()
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useUsage(page, 20)

  if (!can('aicore')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Usage</h1>
        <p className='text-muted-foreground'>Every production AI Core call, real telemetry, fire-and-forget written.</p>
      </div>

      {isLoading && <div className='flex h-40 items-center justify-center text-muted-foreground'>Loading...</div>}
      {!isLoading && error && (
        <div className='flex h-40 items-center justify-center text-destructive'>Failed to load usage.</div>
      )}

      {!isLoading && !error && data && (
        <>
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Tokens (in/out)</TableHead>
                  <TableHead>Cost (USD)</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Manual Review</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-24 text-center text-muted-foreground'>
                      No usage recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <AiOutcomeBadge outcome={entry.outcome} />
                      </TableCell>
                      <TableCell>{entry.retryCount}</TableCell>
                      <TableCell>
                        {entry.tokensIn ?? '—'} / {entry.tokensOut ?? '—'}
                      </TableCell>
                      <TableCell>{entry.costUsd ?? '—'}</TableCell>
                      <TableCell>{entry.latencyMs ? `${entry.latencyMs}ms` : '—'}</TableCell>
                      <TableCell>{entry.needsManualReview ? 'Yes' : 'No'}</TableCell>
                      <TableCell className='text-muted-foreground'>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-muted-foreground'>
              Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)}
            </span>
            <div className='space-x-2'>
              <Button size='sm' variant='outline' disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
