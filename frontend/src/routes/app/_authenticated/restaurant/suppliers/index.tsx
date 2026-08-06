import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsSuppliersPage } from '@/features/restaurant-ops/pages/suppliers/restaurant-ops-suppliers-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/suppliers/')({
  component: RestaurantOpsSuppliersPage,
})
