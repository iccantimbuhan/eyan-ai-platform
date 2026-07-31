import { Main } from '@/components/layout/main'
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
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Costs</h1>
        <p className='text-muted-foreground'>
          Aggregated from AiUsageLog (domain="ai-core" only — Playground spend never counted here).
        </p>
      </div>

      {isLoading && <div className='flex h-40 items-center justify-center text-muted-foreground'>Loading...</div>}

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
