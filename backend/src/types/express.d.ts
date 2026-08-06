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
  };
}>;

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
    }
  }
}

export {};
