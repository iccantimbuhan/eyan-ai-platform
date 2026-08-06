import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsUnitsPage } from '@/features/restaurant-ops/pages/units/restaurant-ops-units-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/units/')({
  component: RestaurantOpsUnitsPage,
})
