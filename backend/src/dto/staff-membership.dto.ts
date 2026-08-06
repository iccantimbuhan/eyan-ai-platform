import type { TenantRole } from "../generated/prisma/enums.js";

export type StaffMembershipScope = "ORGANIZATION" | "RESTAURANT" | "BRANCH";

export interface UpsertStaffMembershipDto {
  email: string;
  name?: string;
  password?: string;
  tenantRole: TenantRole;
  scope: StaffMembershipScope;
  restaurantId?: string;
  branchId?: string;
}

// Restaurant-scoped invites/assignments can never grant ORGANIZATION scope
// — that requires requireOrganizationAccess, a strictly stronger guard than
// requireRestaurantAccess. Scope is inferred (RESTAURANT if branchId is
// omitted, BRANCH if present) rather than accepted from the client.
export interface UpsertStaffMembershipForRestaurantDto {
  email: string;
  name?: string;
  password?: string;
  tenantRole: TenantRole;
  branchId?: string;
}

export interface StaffMembershipGrantDto {
  scope: StaffMembershipScope;
  scopeId: string;
  scopeName: string;
  role: TenantRole;
  assignedAt: Date;
}

export interface StaffMemberResponseDto {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  grants: StaffMembershipGrantDto[];
}
