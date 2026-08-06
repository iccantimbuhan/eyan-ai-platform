import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsIngredientCategoriesPage } from '@/features/restaurant-ops/pages/ingredient-categories/restaurant-ops-ingredient-categories-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/ingredient-categories/')({
  component: RestaurantOpsIngredientCategoriesPage,
})
