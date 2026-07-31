import { createFileRoute } from '@tanstack/react-router'
import { CrmLeadsPage } from '@/features/crm/pages/leads/crm-leads-page'

export const Route = createFileRoute('/app/_authenticated/crm/leads/')({
  component: CrmLeadsPage,
})
