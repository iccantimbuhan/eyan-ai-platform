import { z } from 'zod'

export const menuItemStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const

export const menuItemSchema = z.object({
  menuCategoryId: z.string().min(1, 'Category is required.'),

  name: z.string().trim().min(1, 'Name is required.').max(200, 'Name is too long.'),

  description: z.string().trim().max(1000, 'Description is too long.').optional(),

  price: z
    .string()
    .trim()
    .min(1, 'Price is required.')
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, {
      message: 'Price must be 0 or greater.',
    }),

  imagePath: z.string().trim().max(500, 'Image path is too long.').optional().or(z.literal('')),

  available: z.boolean(),

  status: z.enum(menuItemStatuses, 'Status is required.'),
})

export type MenuItemFormValues = z.infer<typeof menuItemSchema>

export const defaultMenuItemValues: MenuItemFormValues = {
  menuCategoryId: '',
  name: '',
  description: '',
  price: '',
  imagePath: '',
  available: true,
  status: 'DRAFT',
}
