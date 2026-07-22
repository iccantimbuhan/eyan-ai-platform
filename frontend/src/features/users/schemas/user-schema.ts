import { z } from 'zod'

export const availableRoles = ['Owner', 'Admin', 'Viewer'] as const

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(100, 'Name cannot exceed 100 characters.'),

  email: z.email('Please enter a valid email address.').trim().toLowerCase(),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(100, 'Password cannot exceed 100 characters.'),

  roles: z.array(z.enum(availableRoles)).min(1, 'Select at least one role.'),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>

export const defaultCreateUserValues: CreateUserFormValues = {
  name: '',
  email: '',
  password: '',
  roles: ['Viewer'],
}
