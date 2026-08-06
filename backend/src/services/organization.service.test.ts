import { describe, expect, it, vi } from "vitest";

import { OrganizationService } from "./organization.service.js";
import type { ModuleRegistryService } from "./module-registry.service.js";

function createRepositories(overrides: {
  organizations?: Partial<Record<string, unknown>>;
  organizationMembers?: Partial<Record<string, unknown>>;
  restaurants?: Partial<Record<string, unknown>>;
  restaurantMembers?: Partial<Record<string, unknown>>;
  branchMembers?: Partial<Record<string, unknown>>;
} = {}) {
  const organizations = {
    findManyByIds: vi.fn().mockResolvedValue([]),
    ...overrides.organizations,
  };
  const organizationMembers = {
    findByUserId: vi.fn().mockResolvedValue([]),
    ...overrides.organizationMembers,
  };
  const restaurants = {
    findManyByIds: vi.fn().mockResolvedValue([]),
    findManyByOrganizationIds: vi.fn().mockResolvedValue([]),
    ...overrides.restaurants,
  };
  const restaurantMembers = {
    findByUserId: vi.fn().mockResolvedValue([]),
    ...overrides.restaurantMembers,
  };
  const branchMembers = {
    findByUserId: vi.fn().mockResolvedValue([]),
    ...overrides.branchMembers,
  };
  const moduleRegistry: ModuleRegistryService = {
    enabledModuleKeysByOrganization: vi.fn().mockResolvedValue(new Map()),
    setEnabled: vi.fn(),
  } as unknown as ModuleRegistryService;

  return {
    organizations,
    organizationMembers,
    restaurants,
    restaurantMembers,
    branchMembers,
    moduleRegistry,
  };
}

// Sprint 0 (ADR-0025) — this is the service the TeamSwitcher's tenant
// context is built on. Coverage here exists specifically to prove cross-
// tenant isolation at the aggregation layer, not just at the middleware
// layer: a user must never see another Organization's Restaurants, and a
// direct RestaurantMember must never leak sibling Restaurants under the
// same Organization.
describe("OrganizationService.getTenantContextForUser", () => {
  it("returns nothing for a user with no memberships at all", async () => {
    const repos = createRepositories();
    const service = new OrganizationService(
      repos.organizations as never,
      repos.organizationMembers as never,
      repos.restaurants as never,
      repos.restaurantMembers as never,
      repos.branchMembers as never,
      repos.moduleRegistry
    );

    const result = await service.getTenantContextForUser("user-1");

    expect(result).toEqual([]);
  });

  it("an OrganizationMember sees every Restaurant under that Organization, never another tenant's", async () => {
    const repos = createRepositories({
      organizationMembers: {
        findByUserId: vi.fn().mockResolvedValue([{ organizationId: "org-mine" }]),
      },
      organizations: {
        findManyByIds: vi.fn().mockResolvedValue([{ id: "org-mine", name: "Mine" }]),
      },
      restaurants: {
        findManyByOrganizationIds: vi.fn().mockResolvedValue([
          { id: "rest-a", organizationId: "org-mine", name: "A", branches: [] },
          { id: "rest-b", organizationId: "org-mine", name: "B", branches: [] },
        ]),
      },
    });
    const service = new OrganizationService(
      repos.organizations as never,
      repos.organizationMembers as never,
      repos.restaurants as never,
      repos.restaurantMembers as never,
      repos.branchMembers as never,
      repos.moduleRegistry
    );

    const result = await service.getTenantContextForUser("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("org-mine");
    expect(result[0].restaurants.map((r) => r.id).sort()).toEqual(["rest-a", "rest-b"]);
    // Proves the org-scoped fetch is queried by exactly the user's own
    // Organization ids — never an unfiltered "all restaurants" call.
    expect(repos.restaurants.findManyByOrganizationIds).toHaveBeenCalledWith(["org-mine"]);
  });

  it("a direct RestaurantMember sees only that Restaurant, never its siblings under the same Organization", async () => {
    const repos = createRepositories({
      restaurantMembers: {
        findByUserId: vi.fn().mockResolvedValue([{ restaurantId: "rest-a" }]),
      },
      restaurants: {
        findManyByIds: vi.fn().mockResolvedValue([
          { id: "rest-a", organizationId: "org-shared", name: "A", branches: [] },
        ]),
        // The Organization has a sibling Restaurant ("rest-b") the user was
        // never given membership to — it must never appear in the result.
        findManyByOrganizationIds: vi.fn().mockResolvedValue([]),
      },
      organizations: {
        findManyByIds: vi.fn().mockResolvedValue([{ id: "org-shared", name: "Shared Org" }]),
      },
    });
    const service = new OrganizationService(
      repos.organizations as never,
      repos.organizationMembers as never,
      repos.restaurants as never,
      repos.restaurantMembers as never,
      repos.branchMembers as never,
      repos.moduleRegistry
    );

    const result = await service.getTenantContextForUser("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].restaurants).toHaveLength(1);
    expect(result[0].restaurants[0].id).toBe("rest-a");
    // Full-access fetch must never be called with an Organization the user
    // only has restaurant-level (not organization-level) access to.
    expect(repos.restaurants.findManyByOrganizationIds).toHaveBeenCalledWith([]);
  });

  it("maps enabledModules per Organization, not as a flat union across all of a user's Organizations", async () => {
    const enabledModulesByOrg = new Map([
      ["org-a", ["restaurant"]],
      ["org-b", ["finance"]],
    ]);
    const repos = createRepositories({
      organizationMembers: {
        findByUserId: vi
          .fn()
          .mockResolvedValue([{ organizationId: "org-a" }, { organizationId: "org-b" }]),
      },
      organizations: {
        findManyByIds: vi
          .fn()
          .mockResolvedValue([
            { id: "org-a", name: "A" },
            { id: "org-b", name: "B" },
          ]),
      },
    });
    repos.moduleRegistry.enabledModuleKeysByOrganization = vi
      .fn()
      .mockResolvedValue(enabledModulesByOrg);

    const service = new OrganizationService(
      repos.organizations as never,
      repos.organizationMembers as never,
      repos.restaurants as never,
      repos.restaurantMembers as never,
      repos.branchMembers as never,
      repos.moduleRegistry
    );

    const result = await service.getTenantContextForUser("user-1");

    const byId = Object.fromEntries(result.map((org) => [org.id, org.enabledModules]));
    expect(byId["org-a"]).toEqual(["restaurant"]);
    expect(byId["org-b"]).toEqual(["finance"]);
  });
});
