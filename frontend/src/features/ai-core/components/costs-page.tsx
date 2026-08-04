import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useCostSummary } from '../hooks/use-usage'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border p-4'>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p className='text-2xl font-bold'>{value}</p>
    </div>
  )
}

export function CostsPage() {
  const can = useCan()
  const { data, isLoading } = useCostSummary()

  if (!can('aicore')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <PageHeader
        title='Costs'
        description='Aggregated from AiUsageLog (domain="ai-core" only — Playground spend never counted here).'
        breadcrumbs={[
          { label: 'AI Core', to: '/app/ai-core' },
          { label: 'Costs' },
        ]}
      />

      {isLoading && (
        <div className='flex h-40 items-center justify-center text-muted-foreground'>
          Loading...
        </div>
      )}

      {!isLoading && data && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <StatCard label='Total Cost (USD)' value={`$${data.totalCostUsd}`} />
          <StatCard label='Total Calls' value={String(data.totalCalls)} />
          <StatCard label='Tokens In' value={String(data.totalTokensIn)} />
          <StatCard label='Tokens Out' value={String(data.totalTokensOut)} />
        </div>
      )}
    </Main>
  )
}
