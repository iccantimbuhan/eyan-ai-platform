import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsBranchesPage } from '@/features/restaurant-ops/pages/branches/restaurant-ops-branches-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/branches/')({
  component: RestaurantOpsBranchesPage,
})
