import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsMenuItemsPage } from '@/features/restaurant-ops/pages/menu-items/restaurant-ops-menu-items-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/menu-items/')({
  component: RestaurantOpsMenuItemsPage,
})
