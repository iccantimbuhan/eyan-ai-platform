import { z } from 'zod'

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Role name must be at least 2 characters.')
    .max(80),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean(),
  permissions: z.array(z.string()),
})
export type RoleFormValues = z.infer<typeof roleSchema>
export const defaultRoleValues: RoleFormValues = {
  name: '',
  description: '',
  isActive: true,
  permissions: [],
}
