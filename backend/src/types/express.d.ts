import type { Prisma } from "../generated/prisma/client.js";

type AuthenticatedUser = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true;
              };
            };
          };
        };
      };
    };
    organizationMemberships: true;
    restaurantMemberships: true;
    branchMemberships: true;
  };
}>;

// Sprint 1.2 (ADR-0036) — populated by requireOrganizationAccess/
// requireRestaurantAccess/requireBranchAccess (and the MenuCategory/
// MenuItem equivalents) once they've resolved the request's tenant scope,
// so requireTenantRole (composed after them) can resolve the caller's
// effective TenantRole from data already on `req.user`, with no additional
// query — same efficiency principle as authenticate() loading memberships
// once for every downstream middleware to read.
interface TenantRequestContext {
  organizationId?: string;
  restaurantId?: string;
  branchId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
      tenantContext?: TenantRequestContext;
    }
  }
}

export {};
