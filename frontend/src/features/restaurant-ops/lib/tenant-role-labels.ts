import type { StaffMembershipScope, TenantRole } from '../types/restaurant-ops'

export const TENANT_ROLE_OPTIONS: { value: TenantRole; label: string }[] = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'CASHIER', label: 'Cashier' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'INVENTORY_STAFF', label: 'Inventory Staff' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
]

export function tenantRoleLabel(role: TenantRole | string): string {
  return TENANT_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role
}

export const STAFF_SCOPE_OPTIONS: { value: StaffMembershipScope; label: string }[] = [
  { value: 'ORGANIZATION', label: 'Whole Organization' },
  { value: 'RESTAURANT', label: 'One Restaurant' },
  { value: 'BRANCH', label: 'One Branch' },
]

// Only OWNER/MANAGER may manage staff — mirrors the backend's
// requireTenantRole('OWNER', 'MANAGER') gate on every staff route
// (organization-staff.routes.ts, restaurant-staff.routes.ts). Display-only:
// hides actions the backend would 403 anyway, never the real enforcement.
// Accepts a plain string (rather than this file's own narrower TenantRole)
// since the caller is usually organizations-api.ts's OrganizationSummary/
// RestaurantSummary#myRole, whose type also allows the legacy 'STAFF'
// value — never OWNER/MANAGER either way, so the comparison is still exact.
export function canManageStaff(role: string | null): boolean {
  return role === 'OWNER' || role === 'MANAGER'
}
