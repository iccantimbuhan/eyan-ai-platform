import { prisma } from "../lib/prisma.js";

export class BranchRepository {
  async findById(id: string) {
    return prisma.branch.findUnique({ where: { id } });
  }

  async findManyByRestaurantIds(restaurantIds: string[]) {
    if (restaurantIds.length === 0) return [];

    return prisma.branch.findMany({
      where: { restaurantId: { in: restaurantIds } },
    });
  }

  async create(data: { restaurantId: string; name: string }) {
    return prisma.branch.create({ data });
  }
}

export const branchRepository = new BranchRepository();
