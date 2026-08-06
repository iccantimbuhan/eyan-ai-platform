import { prisma } from "../lib/prisma.js";

const withBranches = {
  branches: true,
} as const;

export class RestaurantRepository {
  async findById(id: string) {
    return prisma.restaurant.findUnique({ where: { id } });
  }

  async findManyByIds(ids: string[]) {
    if (ids.length === 0) return [];

    return prisma.restaurant.findMany({
      where: { id: { in: ids } },
      include: withBranches,
    });
  }

  async findManyByOrganizationIds(organizationIds: string[]) {
    if (organizationIds.length === 0) return [];

    return prisma.restaurant.findMany({
      where: { organizationId: { in: organizationIds } },
      include: withBranches,
    });
  }

  async create(data: { organizationId: string; name: string }) {
    return prisma.restaurant.create({ data });
  }
}

export const restaurantRepository = new RestaurantRepository();
