import { createFileRoute } from '@tanstack/react-router'
import { CrmDashboardPage } from '@/features/crm/pages/dashboard/crm-dashboard-page'

export const Route = createFileRoute('/app/_authenticated/crm/')({
  component: CrmDashboardPage,
})
