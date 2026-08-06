import { z } from 'zod'

export const menuCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200, 'Name is too long.'),

  displayOrder: z
    .string()
    .trim()
    .refine((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
      message: 'Display order must be 0 or greater.',
    })
    .optional(),
})

export type MenuCategoryFormValues = z.infer<typeof menuCategorySchema>

export const defaultMenuCategoryValues: MenuCategoryFormValues = {
  name: '',
  displayOrder: '',
}
