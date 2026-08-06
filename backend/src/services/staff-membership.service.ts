import { userRepository, UserRepository } from "../repositories/user.repository.js";
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
import { branchRepository, BranchRepository } from "../repositories/branch.repository.js";
import {
  branchMemberRepository,
  BranchMemberRepository,
} from "../repositories/branch-member.repository.js";
import { hashPassword } from "../utils/password.js";
import { NotFoundError } from "../errors/auth.error.js";
import { StaffInviteRequiresPasswordError, StaffScopeMismatchError } from "../errors/staff.error.js";
import { aggregateStaffGrants } from "../dto/staff-membership.mapper.js";
import type {
  StaffMemberResponseDto,
  UpsertStaffMembershipDto,
  UpsertStaffMembershipForRestaurantDto,
} from "../dto/staff-membership.dto.js";

// Every commercial customer user gets this platform Role, and only this
// Role — the "can this user open Restaurant Operations at all, and
// nothing else" half of ADR-0036. Granting it is additive/idempotent and
// never touches a user's existing platform Roles, so inviting an existing
// internal user (unusual, but not invalid) doesn't strip their access.
const RESTAURANT_CUSTOMER_ROLE_NAME = "Restaurant Customer";

export class StaffMembershipService {
  constructor(
    private readonly users: UserRepository = userRepository,
    private readonly organizations: OrganizationRepository = organizationRepository,
    private readonly organizationMembers: OrganizationMemberRepository = organizationMemberRepository,
    private readonly restaurants: RestaurantRepository = restaurantRepository,
    private readonly restaurantMembers: RestaurantMemberRepository = restaurantMemberRepository,
    private readonly branches: BranchRepository = branchRepository,
    private readonly branchMembers: BranchMemberRepository = branchMemberRepository
  ) {}

  async listForOrganization(organizationId: string): Promise<StaffMemberResponseDto[]> {
    const [organization, restaurantsUnderOrg] = await Promise.all([
      this.organizations.findById(organizationId),
      this.restaurants.findManyByOrganizationIds([organizationId]),
    ]);

    if (!organization) {
      throw new NotFoundError("Organization not found.");
    }

    const restaurantIds = restaurantsUnderOrg.map((restaurant) => restaurant.id);
    const branchIds = restaurantsUnderOrg.flatMap((restaurant) =>
      restaurant.branches.map((branch) => branch.id)
    );

    const [orgMembers, restMembers, branchMemberRows] = await Promise.all([
      this.organizationMembers.findByOrganizationId(organizationId),
      this.restaurantMembers.findByRestaurantIds(restaurantIds),
      this.branchMembers.findByBranchIds(branchIds),
    ]);

    const restaurantNameById = new Map(restaurantsUnderOrg.map((r) => [r.id, r.name]));
    const branchNameById = new Map(
      restaurantsUnderOrg.flatMap((r) => r.branches.map((b) => [b.id, b.name] as const))
    );

    return aggregateStaffGrants([
      ...orgMembers.map((m) => ({
        user: m.user,
        role: m.role,
        assignedAt: m.assignedAt,
        scope: "ORGANIZATION" as const,
        scopeId: organizationId,
        scopeName: organization.name,
      })),
      ...restMembers.map((m) => ({
        user: m.user,
        role: m.role,
        assignedAt: m.assignedAt,
        scope: "RESTAURANT" as const,
        scopeId: m.restaurantId,
        scopeName: restaurantNameById.get(m.restaurantId) ?? "Unknown restaurant",
      })),
      ...branchMemberRows.map((m) => ({
        user: m.user,
        role: m.role,
        assignedAt: m.assignedAt,
        scope: "BRANCH" as const,
        scopeId: m.branchId,
        scopeName: branchNameById.get(m.branchId) ?? "Unknown branch",
      })),
    ]);
  }

  async listForRestaurant(restaurantId: string): Promise<StaffMemberResponseDto[]> {
    const restaurant = await this.restaurants.findById(restaurantId);

    if (!restaurant) {
      throw new NotFoundError("Restaurant not found.");
    }

    const [organization, restaurantBranches] = await Promise.all([
      this.organizations.findById(restaurant.organizationId),
      this.branches.findManyByRestaurantId(restaurantId),
    ]);

    const branchIds = restaurantBranches.map((branch) => branch.id);
    const branchNameById = new Map(restaurantBranches.map((b) => [b.id, b.name]));

    const [orgMembers, restMembers, branchMemberRows] = await Promise.all([
      this.organizationMembers.findByOrganizationId(restaurant.organizationId),
      this.restaurantMembers.findByRestaurantIds([restaurantId]),
      this.branchMembers.findByBranchIds(branchIds),
    ]);

    return aggregateStaffGrants([
      ...orgMembers.map((m) => ({
        user: m.user,
        role: m.role,
        assignedAt: m.assignedAt,
        scope: "ORGANIZATION" as const,
        scopeId: restaurant.organizationId,
        scopeName: organization?.name ?? "Unknown organization",
      })),
      ...restMembers.map((m) => ({
        user: m.user,
        role: m.role,
        assignedAt: m.assignedAt,
        scope: "RESTAURANT" as const,
        scopeId: restaurantId,
        scopeName: restaurant.name,
      })),
      ...branchMemberRows.map((m) => ({
        user: m.user,
        role: m.role,
        assignedAt: m.assignedAt,
        scope: "BRANCH" as const,
        scopeId: m.branchId,
        scopeName: branchNameById.get(m.branchId) ?? "Unknown branch",
      })),
    ]);
  }

  // Serves Invite Staff, Assign Tenant Role, Assign Restaurant, and Assign
  // Branch — all the same operation (an upsert), differing only in which
  // scope fields are provided. Calling this again for an already-invited
  // email either changes their role for the same scope, or grants them an
  // additional scope (e.g. a second restaurant) — both are legitimate uses
  // of the existing multi-membership model (.context/restaurant.md).
  async upsertMembership(
    organizationId: string,
    input: UpsertStaffMembershipDto
  ): Promise<StaffMemberResponseDto> {
    if (input.scope === "RESTAURANT" && !input.restaurantId) {
      throw new StaffScopeMismatchError("restaurantId is required for RESTAURANT scope.");
    }

    if (input.scope === "BRANCH" && !input.branchId) {
      throw new StaffScopeMismatchError("branchId is required for BRANCH scope.");
    }

    if (input.restaurantId) {
      const restaurant = await this.restaurants.findById(input.restaurantId);

      if (!restaurant || restaurant.organizationId !== organizationId) {
        throw new StaffScopeMismatchError(
          "This restaurant does not belong to the given organization."
        );
      }
    }

    if (input.branchId) {
      const branch = await this.branches.findById(input.branchId);

      if (!branch || branch.restaurantId !== input.restaurantId) {
        throw new StaffScopeMismatchError("This branch does not belong to the given restaurant.");
      }
    }

    let user = await this.users.findByEmail(input.email);

    if (!user) {
      if (!input.name || !input.password) {
        throw new StaffInviteRequiresPasswordError();
      }

      const passwordHash = await hashPassword(input.password);
      user = await this.users.create({ name: input.name, email: input.email, passwordHash });
    }

    const restaurantCustomerRole = await this.users.findRoleByName(RESTAURANT_CUSTOMER_ROLE_NAME);

    if (restaurantCustomerRole) {
      await this.users.assignRole(user.id, restaurantCustomerRole.id);
    }

    if (input.scope === "ORGANIZATION") {
      await this.organizationMembers.upsert({
        userId: user.id,
        organizationId,
        role: input.tenantRole,
      });
    } else if (input.scope === "RESTAURANT") {
      await this.restaurantMembers.upsert({
        userId: user.id,
        restaurantId: input.restaurantId!,
        role: input.tenantRole,
      });
    } else {
      await this.branchMembers.upsert({
        userId: user.id,
        branchId: input.branchId!,
        role: input.tenantRole,
      });
    }

    const staff = (await this.listForOrganization(organizationId)).find(
      (member) => member.userId === user!.id
    );

    if (!staff) {
      throw new NotFoundError("Staff member not found after assignment.");
    }

    return staff;
  }

  // Restaurant-scoped counterpart to upsertMembership — resolves
  // organizationId from the restaurant itself (one cheap lookup; Staff
  // Management is a low-frequency admin operation, not a hot list path,
  // so this doesn't warrant threading organizationId through the
  // middleware chain the way list/read paths do) and always assigns
  // RESTAURANT or BRANCH scope, never ORGANIZATION.
  async upsertMembershipUnderRestaurant(
    restaurantId: string,
    input: UpsertStaffMembershipForRestaurantDto
  ): Promise<StaffMemberResponseDto> {
    const restaurant = await this.restaurants.findById(restaurantId);

    if (!restaurant) {
      throw new NotFoundError("Restaurant not found.");
    }

    return this.upsertMembership(restaurant.organizationId, {
      ...input,
      scope: input.branchId ? "BRANCH" : "RESTAURANT",
      restaurantId,
    });
  }

  // "Disable Staff" — a hard revoke of every grant this user holds under
  // this Organization, not a reuse of User.isActive: that flag is global
  // and would incorrectly lock a multi-tenant user out of every other
  // Organization they belong to. Removing membership rows is immediate
  // (authenticate() reloads memberships fresh on every request — no stale
  // JWT window) and correctly scoped to this tenant only.
  async revokeFromOrganization(userId: string, organizationId: string): Promise<void> {
    const restaurantsUnderOrg = await this.restaurants.findManyByOrganizationIds([organizationId]);
    const restaurantIds = restaurantsUnderOrg.map((restaurant) => restaurant.id);
    const branchIds = restaurantsUnderOrg.flatMap((restaurant) =>
      restaurant.branches.map((branch) => branch.id)
    );

    await Promise.all([
      this.organizationMembers.delete(userId, organizationId),
      this.restaurantMembers.deleteManyForUser(userId, restaurantIds),
      this.branchMembers.deleteManyForUser(userId, branchIds),
    ]);
  }

  // Restaurant-scoped revoke intentionally never touches OrganizationMember
  // — a Restaurant Manager can't revoke an Organization-wide Owner's grant
  // through this path, only via the Organization-scoped one (which they
  // wouldn't pass requireOrganizationAccess for unless they hold one
  // themselves).
  async revokeFromRestaurant(userId: string, restaurantId: string): Promise<void> {
    const branches = await this.branches.findManyByRestaurantId(restaurantId);
    const branchIds = branches.map((branch) => branch.id);

    await Promise.all([
      this.restaurantMembers.delete(userId, restaurantId),
      this.branchMembers.deleteManyForUser(userId, branchIds),
    ]);
  }
}

export const staffMembershipService = new StaffMembershipService();
