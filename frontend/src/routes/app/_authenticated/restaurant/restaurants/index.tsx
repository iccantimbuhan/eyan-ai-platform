import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsRestaurantsPage } from '@/features/restaurant-ops/pages/restaurants/restaurant-ops-restaurants-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/restaurants/')({
  component: RestaurantOpsRestaurantsPage,
})
