import { prisma } from "../lib/prisma.js";
import type { TenantRole } from "../generated/prisma/enums.js";

export class RestaurantMemberRepository {
  async findByUserId(userId: string) {
    return prisma.restaurantMember.findMany({ where: { userId } });
  }

  async upsert(data: {
    userId: string;
    restaurantId: string;
    role: TenantRole;
  }) {
    return prisma.restaurantMember.upsert({
      where: {
        userId_restaurantId: {
          userId: data.userId,
          restaurantId: data.restaurantId,
        },
      },
      update: { role: data.role },
      create: data,
    });
  }
}

export const restaurantMemberRepository = new RestaurantMemberRepository();
