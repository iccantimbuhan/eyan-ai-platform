import { z } from 'zod'

export const restaurantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200, 'Name is too long.'),
})

export type RestaurantFormValues = z.infer<typeof restaurantSchema>

export const defaultRestaurantValues: RestaurantFormValues = {
  name: '',
}
