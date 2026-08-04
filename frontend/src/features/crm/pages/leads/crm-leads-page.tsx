import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
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
        <div className='flex h-64 items-center justify-center'>
          Loading leads...
        </div>
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
      <PageHeader
        title='Leads'
        description='Every lead that has come through the pipeline.'
        breadcrumbs={[{ label: 'CRM', to: '/app/crm' }, { label: 'Leads' }]}
      />

      <LeadTable leads={data?.data ?? []} />
    </Main>
  )
}
