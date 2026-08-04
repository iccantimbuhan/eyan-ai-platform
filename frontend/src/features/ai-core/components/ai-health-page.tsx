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
import { useAiCoreHealth } from '../hooks/use-health'
import { useCheckProviderHealth } from '../hooks/use-providers'
import { AiHealthStatusBadge } from '../lib/status-badges'

// Same shape as Automation's own Health page — mirrors it exactly, applied
// to AiProvider instead of McpServerConfig (TDD §14).
export function AiHealthPage() {
  const can = useCan()
  const { data: providers = [], isLoading, error } = useAiCoreHealth()
  const checkHealth = useCheckProviderHealth()

  if (!can('aicore')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <PageHeader
        title='Health'
        description='Connectivity status for every registered AI Core provider.'
        breadcrumbs={[
          { label: 'AI Core', to: '/app/ai-core' },
          { label: 'Health' },
        ]}
      />

      {isLoading && (
        <div className='flex h-40 items-center justify-center text-muted-foreground'>
          Loading...
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
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className='w-32' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='h-24 text-center text-muted-foreground'
                  >
                    No providers registered yet — register one on the Providers
                    page.
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className='font-medium'>
                      {provider.displayName}
                    </TableCell>
                    <TableCell>
                      <AiHealthStatusBadge status={provider.healthStatus} />
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {provider.lastHealthCheckAt
                        ? new Date(provider.lastHealthCheckAt).toLocaleString()
                        : 'Never checked'}
                    </TableCell>
                    <TableCell className='max-w-72 truncate text-muted-foreground'>
                      {provider.lastHealthMessage ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size='sm'
                        variant='outline'
                        disabled={checkHealth.isPending}
                        onClick={() => checkHealth.mutate(provider.id)}
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
