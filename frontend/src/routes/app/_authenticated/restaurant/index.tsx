import { createFileRoute } from '@tanstack/react-router'
import { RestaurantDashboardPage } from '@/features/restaurant-ops/pages/dashboard/restaurant-dashboard-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/')({
  component: RestaurantDashboardPage,
})
