import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useLeads } from '../../hooks/use-leads'
import { LeadTable } from './components/lead-table'

export function CrmLeadsPage() {
  const can = useCan()
  const { data, isLoading, error } = useLeads()

  if (!can('crm')) return <ForbiddenError />

  if (isLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>Loading leads...</div>
      </Main>
    )
  }

  if (error) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center text-destructive'>
          Failed to load leads.
        </div>
      </Main>
    )
  }

  return (
    <Main className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Leads</h1>
        <p className='text-muted-foreground'>Every lead that has come through the pipeline.</p>
      </div>

      <LeadTable leads={data?.data ?? []} />
    </Main>
  )
}
