import { useTenantStore } from '@/stores/tenant-store'
import { useTenantContext } from './use-tenant-context'

// Nav/route-visibility gate for the Module Registry (ADR-0026) — mirrors
// use-can.ts exactly, but checks OrganizationModule enablement instead of
// RBAC permission. This is never the real enforcement: requirePermission
// (and, for Restaurant, requireRestaurantAccess/requireBranchAccess) on the
// backend remain that.
export function useModuleEnabled() {
  const activeOrganizationId = useTenantStore(
    (state) => state.tenant.activeOrganizationId
  )
  const { data: organizations } = useTenantContext()

  return (moduleKey?: string) => {
    if (!moduleKey) return true

    const activeOrganization =
      organizations?.find((organization) => organization.id === activeOrganizationId) ??
      organizations?.[0]

    return activeOrganization?.enabledModules.includes(moduleKey) ?? false
  }
}
