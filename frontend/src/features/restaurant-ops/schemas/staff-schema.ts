import { z } from 'zod'

export const tenantRoles = [
  'OWNER',
  'MANAGER',
  'SUPERVISOR',
  'CASHIER',
  'KITCHEN',
  'INVENTORY_STAFF',
  'ACCOUNTANT',
] as const

export const staffScopes = ['ORGANIZATION', 'RESTAURANT', 'BRANCH'] as const

export const staffSchema = z
  .object({
    email: z.email('A valid email is required.'),

    // Only required when inviting someone who doesn't have an account
    // yet — the backend ignores these when granting additional access to
    // an existing user. See StaffMembershipService.upsertMembership.
    name: z.string().trim().max(100).optional(),
    password: z
      .string()
      .refine((value) => value === '' || value.length >= 8, {
        message: 'Password must be at least 8 characters.',
      })
      .optional(),

    tenantRole: z.enum(tenantRoles, 'Role is required.'),
    scope: z.enum(staffScopes, 'Scope is required.'),
    restaurantId: z.string().optional(),
    branchId: z.string().optional(),
  })
  .refine(
    (values) => !['RESTAURANT', 'BRANCH'].includes(values.scope) || Boolean(values.restaurantId),
    { message: 'Select a restaurant.', path: ['restaurantId'] }
  )
  .refine((values) => values.scope !== 'BRANCH' || Boolean(values.branchId), {
    message: 'Select a branch.',
    path: ['branchId'],
  })

export type StaffFormValues = z.infer<typeof staffSchema>

export const defaultStaffValues: StaffFormValues = {
  email: '',
  name: '',
  password: '',
  tenantRole: 'CASHIER',
  scope: 'RESTAURANT',
  restaurantId: '',
  branchId: '',
}
