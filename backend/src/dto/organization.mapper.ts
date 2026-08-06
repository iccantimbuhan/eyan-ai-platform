import type { Branch, Organization, Restaurant } from "../generated/prisma/client.js";
import type { OrganizationSummaryDto } from "./organization.dto.js";

type RestaurantWithBranches = Restaurant & { branches: Branch[] };

export function mapTenantContextToResponse(
  organizations: Organization[],
  restaurantsByOrganizationId: Map<string, RestaurantWithBranches[]>,
  enabledModulesByOrganizationId: Map<string, string[]>
): OrganizationSummaryDto[] {
  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    restaurants: (restaurantsByOrganizationId.get(organization.id) ?? []).map(
      (restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        branches: restaurant.branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
        })),
      })
    ),
    enabledModules: enabledModulesByOrganizationId.get(organization.id) ?? [],
  }));
}
