import { z } from 'zod'

export const branchSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200, 'Name is too long.'),
})

export type BranchFormValues = z.infer<typeof branchSchema>

export const defaultBranchValues: BranchFormValues = {
  name: '',
}
