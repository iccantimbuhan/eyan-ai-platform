import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useBrains } from '../hooks/use-brains'
import { useCapabilities } from '../hooks/use-capabilities'
import { useProviders } from '../hooks/use-providers'
import { useCostSummary } from '../hooks/use-usage'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border p-4'>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p className='text-2xl font-bold'>{value}</p>
    </div>
  )
}

export function AiCoreDashboardPage() {
  const can = useCan()
  const { data: capabilities = [] } = useCapabilities()
  const { data: brains = [] } = useBrains()
  const { data: providers = [] } = useProviders()
  const { data: costs } = useCostSummary()

  if (!can('aicore')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <PageHeader
        title='AI Core'
        description='The shared AI platform every business module routes AI calls through. Business modules invoke Capabilities only — never a Provider, Model, or Prompt directly.'
        breadcrumbs={[{ label: 'AI Core' }]}
      />

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard label='Capabilities' value={String(capabilities.length)} />
        <StatCard label='Brains' value={String(brains.length)} />
        <StatCard label='Providers' value={String(providers.length)} />
        <StatCard
          label='Total Calls'
          value={costs ? String(costs.totalCalls) : '—'}
        />
      </div>
    </Main>
  )
}
