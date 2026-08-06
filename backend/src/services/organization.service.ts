import {
  organizationRepository,
  OrganizationRepository,
} from "../repositories/organization.repository.js";
import {
  organizationMemberRepository,
  OrganizationMemberRepository,
} from "../repositories/organization-member.repository.js";
import {
  restaurantRepository,
  RestaurantRepository,
} from "../repositories/restaurant.repository.js";
import {
  restaurantMemberRepository,
  RestaurantMemberRepository,
} from "../repositories/restaurant-member.repository.js";
import {
  moduleRegistryService,
  ModuleRegistryService,
} from "./module-registry.service.js";
import { mapTenantContextToResponse } from "../dto/organization.mapper.js";
import type { Branch, Restaurant } from "../generated/prisma/client.js";

type RestaurantWithBranches = Restaurant & { branches: Branch[] };

export class OrganizationService {
  constructor(
    private readonly organizations: OrganizationRepository = organizationRepository,
    private readonly organizationMembers: OrganizationMemberRepository = organizationMemberRepository,
    private readonly restaurants: RestaurantRepository = restaurantRepository,
    private readonly restaurantMembers: RestaurantMemberRepository = restaurantMemberRepository,
    private readonly moduleRegistry: ModuleRegistryService = moduleRegistryService
  ) {}

  // Every Organization/Restaurant/Branch the given user can see, plus which
  // modules are enabled per Organization — the single read the frontend's
  // TeamSwitcher is built on (see ADR-0025). OrganizationMember implies
  // access to every Restaurant/Branch under that Organization;
  // RestaurantMember scopes a user to just that one Restaurant (and its
  // Branches) without granting the rest of its siblings under the same
  // Organization.
  async getTenantContextForUser(userId: string) {
    const [organizationMemberships, restaurantMemberships] =
      await Promise.all([
        this.organizationMembers.findByUserId(userId),
        this.restaurantMembers.findByUserId(userId),
      ]);

    const fullAccessOrganizationIds = new Set(
      organizationMemberships.map((membership) => membership.organizationId)
    );
    const directRestaurantIds = restaurantMemberships.map(
      (membership) => membership.restaurantId
    );

    const directRestaurants =
      await this.restaurants.findManyByIds(directRestaurantIds);

    // An Organization reached only through a direct Restaurant membership
    // is still visible (so the switcher can show its name), but scoped to
    // just that Restaurant, never its siblings under the same Organization.
    const restaurantOnlyOrganizationIds = new Set(
      directRestaurants
        .map((restaurant) => restaurant.organizationId)
        .filter(
          (organizationId) => !fullAccessOrganizationIds.has(organizationId)
        )
    );

    const allVisibleOrganizationIds = [
      ...fullAccessOrganizationIds,
      ...restaurantOnlyOrganizationIds,
    ];

    const [organizations, fullAccessRestaurants, enabledModulesByOrganizationId] =
      await Promise.all([
        this.organizations.findManyByIds(allVisibleOrganizationIds),
        this.restaurants.findManyByOrganizationIds([
          ...fullAccessOrganizationIds,
        ]),
        this.moduleRegistry.enabledModuleKeysByOrganization(
          allVisibleOrganizationIds
        ),
      ]);

    const restaurantsByOrganizationId = new Map<
      string,
      RestaurantWithBranches[]
    >();

    for (const restaurant of [...fullAccessRestaurants, ...directRestaurants]) {
      const existing =
        restaurantsByOrganizationId.get(restaurant.organizationId) ?? [];

      if (!existing.some((entry) => entry.id === restaurant.id)) {
        existing.push(restaurant);
      }

      restaurantsByOrganizationId.set(restaurant.organizationId, existing);
    }

    return mapTenantContextToResponse(
      organizations,
      restaurantsByOrganizationId,
      enabledModulesByOrganizationId
    );
  }
}

export const organizationService = new OrganizationService();
