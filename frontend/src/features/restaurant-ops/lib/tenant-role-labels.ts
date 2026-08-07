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

// Inventory Foundation (Sprint 2A, ADR-0038) — mirrors the backend's
// requireTenantRole('OWNER', 'MANAGER', 'SUPERVISOR', 'INVENTORY_STAFF')
// gate on every Inventory write route. Display-only: hides opening-stock/
// adjustment/waste/stock-count/minimum-threshold actions the backend would
// 403 anyway, never the real enforcement.
const INVENTORY_WRITE_ROLES = new Set(['OWNER', 'MANAGER', 'SUPERVISOR', 'INVENTORY_STAFF'])

export function canWriteInventory(role: string | null): boolean {
  return role !== null && INVENTORY_WRITE_ROLES.has(role)
}

// Sales Foundation (Sprint 2C, ADR-0039) — mirrors the backend's
// requireTenantRole('OWNER', 'MANAGER', 'SUPERVISOR', 'ACCOUNTANT') gate on
// every Sales write route (daily sales records, their line entries, and
// the three master-list create routes). Display-only: hides "Add Daily
// Sales"/line-entry actions the backend would 403 anyway, never the real
// enforcement.
const SALES_WRITE_ROLES = new Set(['OWNER', 'MANAGER', 'SUPERVISOR', 'ACCOUNTANT'])

export function canWriteSales(role: string | null): boolean {
  return role !== null && SALES_WRITE_ROLES.has(role)
}
