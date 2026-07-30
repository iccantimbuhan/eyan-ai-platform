import { createFileRoute } from '@tanstack/react-router'
import { FinanceDashboardPage } from '@/features/finance/pages/dashboard/finance-dashboard-page'

export const Route = createFileRoute('/app/_authenticated/finance/')({
  component: FinanceDashboardPage,
})
