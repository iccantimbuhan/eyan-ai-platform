import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsStaffPage } from '@/features/restaurant-ops/pages/staff/restaurant-ops-staff-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/staff/')({
  component: RestaurantOpsStaffPage,
})
