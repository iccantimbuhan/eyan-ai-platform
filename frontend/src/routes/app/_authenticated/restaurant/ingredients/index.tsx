import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsIngredientsPage } from '@/features/restaurant-ops/pages/ingredients/restaurant-ops-ingredients-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/ingredients/')({
  component: RestaurantOpsIngredientsPage,
})
