import { z } from 'zod'

export const budgetSchema = z.object({
  monthlyLimit: z
    .string()
    .trim()
    .min(1, 'Monthly budget is required.')
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: 'Monthly budget must be greater than 0.',
    }),
})

export type BudgetFormValues = z.infer<typeof budgetSchema>
