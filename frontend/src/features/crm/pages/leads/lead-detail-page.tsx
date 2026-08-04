import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useUsers } from '@/features/users/hooks/use-users'
import { useLead } from '../../hooks/use-leads'
import {
  priorityBadgeVariant,
  priorityLabel,
  statusBadgeVariant,
  statusLabel,
} from '../../lib/lead-lifecycle'
import { AiAnalysisCard } from './components/ai-analysis-card'
import { AssignLeadDialog } from './components/assign-lead-dialog'
import { EditLeadDialog } from './components/edit-lead-dialog'
import { LeadStatusDialog } from './components/lead-status-dialog'
import { LeadTimeline } from './components/lead-timeline'

export function LeadDetailPage() {
  const can = useCan()
  const { leadId } = useParams({
    from: '/app/_authenticated/crm/leads/$leadId',
  })
  const { data: lead, isLoading, error } = useLead(leadId)
  const { data: users } = useUsers()

  const [editOpen, setEditOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  if (!can('crm')) return <ForbiddenError />

  if (isLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>
          Loading lead...
        </div>
      </Main>
    )
  }

  if (error || !lead) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center text-destructive'>
          Failed to load this lead.
        </div>
      </Main>
    )
  }

  const assignedRep = users?.find((user) => user.id === lead.assignedToId)

  return (
    <>
      <Main className='space-y-6'>
        <PageHeader
          title={
            <span className='flex items-center gap-3'>
              {lead.contactName}
              <Badge variant={statusBadgeVariant(lead.status)}>
                {statusLabel(lead.status)}
              </Badge>
              {lead.priority && (
                <Badge variant={priorityBadgeVariant(lead.priority)}>
                  {priorityLabel(lead.priority)}
                </Badge>
              )}
            </span>
          }
          description={`${lead.email}${lead.company ? ` · ${lead.company}` : ''}`}
          backTo='/app/crm/leads'
          backLabel='Back to Leads'
          breadcrumbs={[
            { label: 'CRM', to: '/app/crm' },
            { label: 'Leads', to: '/app/crm/leads' },
            { label: lead.contactName },
          ]}
          actions={
            <Button variant='outline' onClick={() => setEditOpen(true)}>
              <Pencil className='mr-2 h-4 w-4' />
              Edit
            </Button>
          }
        />

        <div className='grid gap-6 lg:grid-cols-3'>
          <div className='space-y-6 lg:col-span-2'>
            <AiAnalysisCard
              leadId={lead.id}
              leadStatus={lead.status}
              aiAnalyses={lead.aiAnalyses}
            />
            <LeadTimeline leadId={lead.id} activities={lead.activities} />
          </div>

          <div className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Phone</span>
                  <span>{lead.phone || '—'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Industry</span>
                  <span>{lead.industry || '—'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Company Size</span>
                  <span>{lead.companySize || '—'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Source</span>
                  <span>{lead.source.replace('_', ' ')}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Score</span>
                  <span>{lead.score ?? '—'}</span>
                </div>
                {lead.status === 'LOST' && lead.lostReason && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Lost Reason</span>
                    <span>{lead.lostReason}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <Badge variant={statusBadgeVariant(lead.status)}>
                  {statusLabel(lead.status)}
                </Badge>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full'
                  onClick={() => setStatusOpen(true)}
                >
                  Change Status
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assigned Sales Rep</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <p className='text-sm'>{assignedRep?.name ?? 'Unassigned'}</p>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full'
                  onClick={() => setAssignOpen(true)}
                >
                  {assignedRep ? 'Reassign' : 'Assign'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>

      <EditLeadDialog lead={lead} open={editOpen} onOpenChange={setEditOpen} />
      <LeadStatusDialog
        lead={lead}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
      <AssignLeadDialog
        lead={lead}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />
    </>
  )
}
