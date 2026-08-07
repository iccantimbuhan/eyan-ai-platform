import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsSalesPage } from '@/features/restaurant-ops/pages/sales/restaurant-ops-sales-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/sales/')({
  component: RestaurantOpsSalesPage,
})
