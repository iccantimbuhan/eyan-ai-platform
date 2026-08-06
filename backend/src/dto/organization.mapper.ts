import type { Branch, Organization, Restaurant } from "../generated/prisma/client.js";
import type { TenantRole } from "../generated/prisma/enums.js";
import type { OrganizationSummaryDto } from "./organization.dto.js";

type RestaurantWithBranches = Restaurant & { branches: Branch[] };

// Sprint 1.2 (ADR-0036) — myRole* maps carry the calling user's own
// TenantRole at each level, most-specific-wins (Branch > Restaurant >
// Organization), for display purposes only.
export function mapTenantContextToResponse(
  organizations: Organization[],
  restaurantsByOrganizationId: Map<string, RestaurantWithBranches[]>,
  enabledModulesByOrganizationId: Map<string, string[]>,
  myRoleByOrganizationId: Map<string, TenantRole>,
  myRoleByRestaurantId: Map<string, TenantRole>,
  myRoleByBranchId: Map<string, TenantRole>
): OrganizationSummaryDto[] {
  return organizations.map((organization) => {
    const organizationRole = myRoleByOrganizationId.get(organization.id) ?? null;

    return {
      id: organization.id,
      name: organization.name,
      restaurants: (restaurantsByOrganizationId.get(organization.id) ?? []).map((restaurant) => {
        const restaurantRole = myRoleByRestaurantId.get(restaurant.id) ?? organizationRole;

        return {
          id: restaurant.id,
          name: restaurant.name,
          myRole: restaurantRole,
          branches: restaurant.branches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            myRole: myRoleByBranchId.get(branch.id) ?? restaurantRole,
          })),
        };
      }),
      enabledModules: enabledModulesByOrganizationId.get(organization.id) ?? [],
      myRole: organizationRole,
    };
  });
}
