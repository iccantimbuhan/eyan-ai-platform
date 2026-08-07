import { createFileRoute } from '@tanstack/react-router'
import { RestaurantOpsSalesWeeklyPage } from '@/features/restaurant-ops/pages/sales/restaurant-ops-sales-weekly-page'

export const Route = createFileRoute('/app/_authenticated/restaurant/sales/weekly')({
  component: RestaurantOpsSalesWeeklyPage,
})
