import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsMenuCategoriesPage } from '@/features/restaurant-ops/pages/menu-categories/restaurant-ops-menu-categories-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/menu-categories/')({
  component: RestaurantOpsMenuCategoriesPage,
})
