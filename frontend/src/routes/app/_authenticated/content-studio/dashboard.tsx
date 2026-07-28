import { createFileRoute } from '@tanstack/react-router'

import { ProductionDashboard } from '@/features/content-studio/pages/production-dashboard'

export const Route = createFileRoute(
  '/app/_authenticated/content-studio/dashboard'
)({
  component: ProductionDashboard,
})
