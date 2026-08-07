import { useTenantStore } from '@/stores/tenant-store'
import { useTenantContext } from '@/features/organizations/hooks/use-tenant-context'

// The active Organization/Restaurant selected via TeamSwitcher, falling
// back to the first one available when nothing has been explicitly picked
// yet — same fallback convention as use-module-enabled.ts. Every
// restaurant-ops page reads scope from here rather than re-deriving it,
// so switching restaurants in the TeamSwitcher immediately re-scopes
// whichever page is open.
export function useActiveTenant() {
  const activeOrganizationId = useTenantStore((state) => state.tenant.activeOrganizationId)
  const activeRestaurantId = useTenantStore((state) => state.tenant.activeRestaurantId)
  const activeBranchId = useTenantStore((state) => state.tenant.activeBranchId)
  const { data: organizations, isLoading } = useTenantContext()

  const activeOrganization =
    organizations?.find((organization) => organization.id === activeOrganizationId) ??
    organizations?.[0]

  const activeRestaurant =
    activeOrganization?.restaurants.find((restaurant) => restaurant.id === activeRestaurantId) ??
    activeOrganization?.restaurants[0]

  // Sprint 2A (Inventory) — same fallback convention as activeRestaurant
  // above: fall back to the first Branch under the active Restaurant when
  // nothing has been explicitly picked in the TeamSwitcher yet.
  const activeBranch =
    activeRestaurant?.branches.find((branch) => branch.id === activeBranchId) ??
    activeRestaurant?.branches[0]

  return {
    isLoading,
    organizationId: activeOrganization?.id,
    organizationRole: activeOrganization?.myRole ?? null,
    restaurantId: activeRestaurant?.id,
    restaurants: activeOrganization?.restaurants ?? [],
    branchId: activeBranch?.id,
    branches: activeRestaurant?.branches ?? [],
  }
}
