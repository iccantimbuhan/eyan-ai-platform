import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, TrendingUp, Users, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useLeads } from '../../hooks/use-leads'
import { statusBadgeVariant, statusLabel } from '../../lib/lead-lifecycle'
import type { LeadStatus } from '../../types/crm'
import { PipelineBreakdownChart } from './components/pipeline-breakdown-chart'

const ALL_STATUSES: LeadStatus[] = [
  'NEW',
  'VALIDATED',
  'DISQUALIFIED',
  'AI_ANALYZED',
  'QUALIFIED',
  'CONTACTED',
  'NEGOTIATION',
  'CONVERTED',
  'LOST',
]

const QUALIFIED_PLUS: LeadStatus[] = [
  'QUALIFIED',
  'CONTACTED',
  'NEGOTIATION',
  'CONVERTED',
]

export function CrmDashboardPage() {
  const can = useCan()
  const { data, isLoading, error } = useLeads()

  if (!can('crm')) return <ForbiddenError />

  if (isLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>
          Loading pipeline...
        </div>
      </Main>
    )
  }

  if (error || !data) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center text-destructive'>
          Failed to load the CRM dashboard.
        </div>
      </Main>
    )
  }

  const leads = data.data
  const totalLeads = leads.length
  const newCount = leads.filter((lead) => lead.status === 'NEW').length
  const qualifiedPlusCount = leads.filter((lead) =>
    QUALIFIED_PLUS.includes(lead.status)
  ).length
  const convertedCount = leads.filter(
    (lead) => lead.status === 'CONVERTED'
  ).length

  const statusCounts = ALL_STATUSES.map((status) => ({
    status,
    count: leads.filter((lead) => lead.status === status).length,
  }))

  const recentLeads = [...leads]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5)

  return (
    <Main className='space-y-6'>
      <PageHeader
        title='CRM'
        description='Lead pipeline overview.'
        breadcrumbs={[{ label: 'CRM' }]}
        actions={
          <Button asChild>
            <Link to='/app/crm/leads'>View All Leads</Link>
          </Button>
        }
      />

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          title='Total Leads'
          value={totalLeads}
          description='All time'
          icon={<Users />}
        />

        <StatCard
          title='New'
          value={newCount}
          description='Awaiting triage'
          icon={<Sparkles />}
        />

        <StatCard
          title='Qualified+'
          value={qualifiedPlusCount}
          description='Qualified, Contacted, Negotiation, Converted'
          icon={<TrendingUp />}
        />

        <StatCard
          title='Converted'
          value={convertedCount}
          description='All time'
          icon={<CheckCircle2 />}
        />
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <PipelineBreakdownChart statusCounts={statusCounts} />

        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No leads yet.</p>
            ) : (
              <div className='divide-y'>
                {recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    to='/app/crm/leads/$leadId'
                    params={{ leadId: lead.id }}
                    className='flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:opacity-80'
                  >
                    <div>
                      <p className='text-sm font-medium'>{lead.contactName}</p>
                      <p className='text-xs text-muted-foreground'>
                        {lead.company || lead.email} ·{' '}
                        {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(lead.status)}>
                      {statusLabel(lead.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
