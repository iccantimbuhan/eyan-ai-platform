import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsInventoryPage } from '@/features/restaurant-ops/pages/inventory/restaurant-ops-inventory-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/inventory/')({
  component: RestaurantOpsInventoryPage,
})
