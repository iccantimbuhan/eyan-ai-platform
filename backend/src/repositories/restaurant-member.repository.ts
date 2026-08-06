import { prisma } from "../lib/prisma.js";
import type { TenantRole } from "../generated/prisma/enums.js";

export class RestaurantMemberRepository {
  async findByUserId(userId: string) {
    return prisma.restaurantMember.findMany({ where: { userId } });
  }

  async findByRestaurantIds(restaurantIds: string[]) {
    if (restaurantIds.length === 0) return [];

    return prisma.restaurantMember.findMany({
      where: { restaurantId: { in: restaurantIds } },
      include: { user: true },
    });
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

  async delete(userId: string, restaurantId: string) {
    return prisma.restaurantMember.deleteMany({ where: { userId, restaurantId } });
  }

  async deleteManyForUser(userId: string, restaurantIds: string[]) {
    if (restaurantIds.length === 0) return { count: 0 };

    return prisma.restaurantMember.deleteMany({
      where: { userId, restaurantId: { in: restaurantIds } },
    });
  }
}

export const restaurantMemberRepository = new RestaurantMemberRepository();
