import { api } from '@/services/api'

export type TenantRole =
  | 'OWNER'
  | 'MANAGER'
  | 'STAFF'
  | 'SUPERVISOR'
  | 'CASHIER'
  | 'KITCHEN'
  | 'INVENTORY_STAFF'
  | 'ACCOUNTANT'

export interface BranchSummary {
  id: string
  name: string
  // Sprint 1.2 (ADR-0036) — display-only context for hiding actions the
  // caller's role can't perform; the backend's requireTenantRole is the
  // real enforcement, always.
  myRole: TenantRole | null
}

export interface RestaurantSummary {
  id: string
  name: string
  branches: BranchSummary[]
  myRole: TenantRole | null
}

export interface OrganizationSummary {
  id: string
  name: string
  restaurants: RestaurantSummary[]
  enabledModules: string[]
  myRole: TenantRole | null
}

export async function getTenantContext() {
  const { data } = await api.get<{ data: OrganizationSummary[] }>(
    '/organizations/me'
  )

  return data.data
}
