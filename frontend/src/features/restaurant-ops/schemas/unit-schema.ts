import { z } from 'zod'

export const unitSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100, 'Name is too long.'),
  abbreviation: z.string().trim().min(1, 'Abbreviation is required.').max(20, 'Too long.'),
})

export type UnitFormValues = z.infer<typeof unitSchema>

export const defaultUnitValues: UnitFormValues = {
  name: '',
  abbreviation: '',
}
