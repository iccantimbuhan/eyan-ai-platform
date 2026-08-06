import type { TenantRole } from "../generated/prisma/enums.js";
import type { User } from "../generated/prisma/client.js";
import type { StaffMemberResponseDto, StaffMembershipScope } from "./staff-membership.dto.js";

interface RawGrant {
  user: Pick<User, "id" | "name" | "email" | "isActive">;
  role: TenantRole;
  assignedAt: Date;
  scope: StaffMembershipScope;
  scopeId: string;
  scopeName: string;
}

// Aggregates raw membership rows (Organization/Restaurant/Branch — each
// queried independently, since they're three different tables) into one
// row per staff member, each carrying every grant they hold. A single
// staff member legitimately holding multiple grants (e.g. RestaurantMember
// on two of three restaurants, but not the third) is expected, not a bug —
// see .context/restaurant.md's RestaurantMember scoping rule.
export function aggregateStaffGrants(grants: RawGrant[]): StaffMemberResponseDto[] {
  const byUserId = new Map<string, StaffMemberResponseDto>();

  for (const grant of grants) {
    const grantDto = {
      scope: grant.scope,
      scopeId: grant.scopeId,
      scopeName: grant.scopeName,
      role: grant.role,
      assignedAt: grant.assignedAt,
    };

    const existing = byUserId.get(grant.user.id);

    if (existing) {
      existing.grants.push(grantDto);
      continue;
    }

    byUserId.set(grant.user.id, {
      userId: grant.user.id,
      name: grant.user.name,
      email: grant.user.email,
      isActive: grant.user.isActive,
      grants: [grantDto],
    });
  }

  return Array.from(byUserId.values());
}
