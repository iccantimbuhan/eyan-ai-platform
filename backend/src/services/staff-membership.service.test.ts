import { describe, expect, it, vi } from "vitest";

import { StaffMembershipService } from "./staff-membership.service.js";
import { StaffInviteRequiresPasswordError, StaffScopeMismatchError } from "../errors/staff.error.js";
import { NotFoundError } from "../errors/auth.error.js";

function userRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    name: "Jane Cashier",
    email: "jane@burgersink.test",
    isActive: true,
    ...overrides,
  };
}

function createRepositories(overrides: Partial<Record<string, unknown>> = {}) {
  const users = {
    findByEmail: vi.fn().mockResolvedValue(userRow()),
    create: vi.fn().mockResolvedValue(userRow()),
    findRoleByName: vi.fn().mockResolvedValue({ id: "role-restaurant-customer" }),
    assignRole: vi.fn().mockResolvedValue({}),
    ...(overrides.users as object),
  };
  const organizations = {
    findById: vi.fn().mockResolvedValue({ id: "org-1", name: "Burger Ink Org" }),
    ...(overrides.organizations as object),
  };
  const organizationMembers = {
    findByOrganizationId: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    ...(overrides.organizationMembers as object),
  };
  const restaurants = {
    findById: vi.fn().mockResolvedValue({ id: "rest-1", organizationId: "org-1", name: "Burger's Ink" }),
    findManyByOrganizationIds: vi.fn().mockResolvedValue([
      { id: "rest-1", organizationId: "org-1", name: "Burger's Ink", branches: [] },
    ]),
    ...(overrides.restaurants as object),
  };
  const restaurantMembers = {
    findByRestaurantIds: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteManyForUser: vi.fn().mockResolvedValue({}),
    ...(overrides.restaurantMembers as object),
  };
  const branches = {
    findById: vi.fn().mockResolvedValue({ id: "branch-1", restaurantId: "rest-1", name: "Main Branch" }),
    findManyByRestaurantId: vi.fn().mockResolvedValue([]),
    ...(overrides.branches as object),
  };
  const branchMembers = {
    findByBranchIds: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteManyForUser: vi.fn().mockResolvedValue({}),
    ...(overrides.branchMembers as object),
  };

  return { users, organizations, organizationMembers, restaurants, restaurantMembers, branches, branchMembers };
}

function createService(overrides: Partial<Record<string, unknown>> = {}) {
  const repos = createRepositories(overrides);
  const service = new StaffMembershipService(
    repos.users as never,
    repos.organizations as never,
    repos.organizationMembers as never,
    repos.restaurants as never,
    repos.restaurantMembers as never,
    repos.branches as never,
    repos.branchMembers as never
  );
  return { service, repos };
}

describe("StaffMembershipService.listForOrganization", () => {
  it("aggregates a single user's Organization, Restaurant, and Branch grants into one row", async () => {
    const { service } = createService({
      organizationMembers: {
        findByOrganizationId: vi
          .fn()
          .mockResolvedValue([{ user: userRow(), role: "OWNER", assignedAt: new Date() }]),
      },
      restaurants: {
        findManyByOrganizationIds: vi.fn().mockResolvedValue([
          {
            id: "rest-1",
            organizationId: "org-1",
            name: "Burger's Ink",
            branches: [{ id: "branch-1", name: "Main Branch" }],
          },
        ]),
      },
      restaurantMembers: {
        findByRestaurantIds: vi
          .fn()
          .mockResolvedValue([
            { user: userRow(), role: "MANAGER", assignedAt: new Date(), restaurantId: "rest-1" },
          ]),
      },
      branchMembers: {
        findByBranchIds: vi
          .fn()
          .mockResolvedValue([
            { user: userRow(), role: "CASHIER", assignedAt: new Date(), branchId: "branch-1" },
          ]),
      },
    });

    const result = await service.listForOrganization("org-1");

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("user-1");
    expect(result[0].grants.map((g) => g.scope).sort()).toEqual([
      "BRANCH",
      "ORGANIZATION",
      "RESTAURANT",
    ]);
  });

  it("throws NotFoundError when the organization doesn't exist", async () => {
    const { service } = createService({
      organizations: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.listForOrganization("missing")).rejects.toThrow(NotFoundError);
  });
});

describe("StaffMembershipService.upsertMembership", () => {
  it("creates a new user, grants the Restaurant Customer platform role, and creates the membership", async () => {
    const { service, repos } = createService({
      users: { findByEmail: vi.fn().mockResolvedValue(null) },
      // Reflects the row the upsert below would have created — the
      // service re-reads via listForOrganization() to build its response,
      // reusing that aggregation rather than duplicating it (see
      // upsertMembership's comment).
      organizationMembers: {
        findByOrganizationId: vi
          .fn()
          .mockResolvedValue([
            { user: userRow({ email: "new@burgersink.test" }), role: "CASHIER", assignedAt: new Date() },
          ]),
      },
    });

    await service.upsertMembership("org-1", {
      email: "new@burgersink.test",
      name: "New Hire",
      password: "SuperSecret123",
      tenantRole: "CASHIER",
      scope: "ORGANIZATION",
    });

    expect(repos.users.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Hire", email: "new@burgersink.test" })
    );
    expect(repos.users.assignRole).toHaveBeenCalledWith("user-1", "role-restaurant-customer");
    expect(repos.organizationMembers.upsert).toHaveBeenCalledWith({
      userId: "user-1",
      organizationId: "org-1",
      role: "CASHIER",
    });
  });

  it("reuses an existing user by email instead of creating a duplicate", async () => {
    const { service, repos } = createService({
      restaurantMembers: {
        findByRestaurantIds: vi
          .fn()
          .mockResolvedValue([
            { user: userRow(), role: "MANAGER", assignedAt: new Date(), restaurantId: "rest-1" },
          ]),
      },
    });

    await service.upsertMembership("org-1", {
      email: "jane@burgersink.test",
      tenantRole: "MANAGER",
      scope: "RESTAURANT",
      restaurantId: "rest-1",
    });

    expect(repos.users.create).not.toHaveBeenCalled();
    expect(repos.restaurantMembers.upsert).toHaveBeenCalledWith({
      userId: "user-1",
      restaurantId: "rest-1",
      role: "MANAGER",
    });
  });

  it("throws StaffInviteRequiresPasswordError when inviting a brand-new email without a password", async () => {
    const { service } = createService({
      users: { findByEmail: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.upsertMembership("org-1", {
        email: "new@burgersink.test",
        tenantRole: "CASHIER",
        scope: "ORGANIZATION",
      })
    ).rejects.toThrow(StaffInviteRequiresPasswordError);
  });

  // The single highest-risk footgun for this feature: a restaurantId that
  // doesn't actually belong to the organization the caller was authorized
  // against must never be accepted.
  it("throws StaffScopeMismatchError when restaurantId doesn't belong to the given organization", async () => {
    const { service } = createService({
      restaurants: {
        findById: vi
          .fn()
          .mockResolvedValue({ id: "rest-other", organizationId: "org-OTHER", name: "Other" }),
      },
    });

    await expect(
      service.upsertMembership("org-1", {
        email: "jane@burgersink.test",
        tenantRole: "MANAGER",
        scope: "RESTAURANT",
        restaurantId: "rest-other",
      })
    ).rejects.toThrow(StaffScopeMismatchError);
  });

  it("throws StaffScopeMismatchError when branchId doesn't belong to the given restaurant", async () => {
    const { service } = createService({
      branches: {
        findById: vi
          .fn()
          .mockResolvedValue({ id: "branch-other", restaurantId: "rest-OTHER", name: "Other" }),
      },
    });

    await expect(
      service.upsertMembership("org-1", {
        email: "jane@burgersink.test",
        tenantRole: "CASHIER",
        scope: "BRANCH",
        restaurantId: "rest-1",
        branchId: "branch-other",
      })
    ).rejects.toThrow(StaffScopeMismatchError);
  });
});

describe("StaffMembershipService.upsertMembershipUnderRestaurant", () => {
  it("resolves organizationId from the restaurant and assigns RESTAURANT scope when no branchId is given", async () => {
    const { service, repos } = createService({
      restaurantMembers: {
        findByRestaurantIds: vi
          .fn()
          .mockResolvedValue([
            { user: userRow(), role: "SUPERVISOR", assignedAt: new Date(), restaurantId: "rest-1" },
          ]),
      },
    });

    await service.upsertMembershipUnderRestaurant("rest-1", {
      email: "jane@burgersink.test",
      tenantRole: "SUPERVISOR",
    });

    expect(repos.restaurantMembers.upsert).toHaveBeenCalledWith({
      userId: "user-1",
      restaurantId: "rest-1",
      role: "SUPERVISOR",
    });
    expect(repos.organizationMembers.upsert).not.toHaveBeenCalled();
  });

  it("assigns BRANCH scope when a branchId is given", async () => {
    const { service, repos } = createService({
      branchMembers: {
        findByBranchIds: vi
          .fn()
          .mockResolvedValue([
            { user: userRow(), role: "KITCHEN", assignedAt: new Date(), branchId: "branch-1" },
          ]),
      },
    });

    await service.upsertMembershipUnderRestaurant("rest-1", {
      email: "jane@burgersink.test",
      tenantRole: "KITCHEN",
      branchId: "branch-1",
    });

    expect(repos.branchMembers.upsert).toHaveBeenCalledWith({
      userId: "user-1",
      branchId: "branch-1",
      role: "KITCHEN",
    });
  });
});

describe("StaffMembershipService revoke", () => {
  it("revokeFromOrganization removes Organization, Restaurant, and Branch grants under that org", async () => {
    const { service, repos } = createService({
      restaurants: {
        findManyByOrganizationIds: vi.fn().mockResolvedValue([
          { id: "rest-1", organizationId: "org-1", name: "Burger's Ink", branches: [{ id: "branch-1", name: "Main" }] },
        ]),
      },
    });

    await service.revokeFromOrganization("user-1", "org-1");

    expect(repos.organizationMembers.delete).toHaveBeenCalledWith("user-1", "org-1");
    expect(repos.restaurantMembers.deleteManyForUser).toHaveBeenCalledWith("user-1", ["rest-1"]);
    expect(repos.branchMembers.deleteManyForUser).toHaveBeenCalledWith("user-1", ["branch-1"]);
  });

  it("revokeFromRestaurant removes only Restaurant/Branch grants, never touches OrganizationMember", async () => {
    const { service, repos } = createService({
      branches: {
        findManyByRestaurantId: vi.fn().mockResolvedValue([{ id: "branch-1", name: "Main" }]),
      },
    });

    await service.revokeFromRestaurant("user-1", "rest-1");

    expect(repos.restaurantMembers.delete).toHaveBeenCalledWith("user-1", "rest-1");
    expect(repos.branchMembers.deleteManyForUser).toHaveBeenCalledWith("user-1", ["branch-1"]);
    expect(repos.organizationMembers.delete).not.toHaveBeenCalled();
  });
});
