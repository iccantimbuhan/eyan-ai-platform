import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsRecipesPage } from '@/features/restaurant-ops/pages/recipes/restaurant-ops-recipes-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/recipes/')({
  component: RestaurantOpsRecipesPage,
})
