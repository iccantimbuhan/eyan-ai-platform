import { z } from 'zod'

export const availableRoles = ['Owner', 'Admin', 'Viewer'] as const

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),

  email: z.email('Invalid email address.'),

  roles: z.array(z.string()).min(1, 'Select at least one role.'),

  isActive: z.boolean(),
})

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>
