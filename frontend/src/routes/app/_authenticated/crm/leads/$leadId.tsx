import { createFileRoute } from '@tanstack/react-router'
import { LeadDetailPage } from '@/features/crm/pages/leads/lead-detail-page'

export const Route = createFileRoute('/app/_authenticated/crm/leads/$leadId')({
  component: LeadDetailPage,
})
