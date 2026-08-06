import { z } from 'zod'

export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200, 'Name is too long.'),
  phone: z.string().trim().max(50, 'Too long.').optional(),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || z.string().email().safeParse(value).success, {
      message: 'Invalid email.',
    })
    .optional(),
  notes: z.string().trim().max(1000, 'Too long.').optional(),
})

export type SupplierFormValues = z.infer<typeof supplierSchema>

export const defaultSupplierValues: SupplierFormValues = {
  name: '',
  phone: '',
  email: '',
  notes: '',
}
