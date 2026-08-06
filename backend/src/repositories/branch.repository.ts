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

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.branch.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(data: { restaurantId: string; name: string }) {
    return prisma.branch.create({ data });
  }

  async update(id: string, data: { name?: string }) {
    return prisma.branch.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.branch.delete({ where: { id } });
  }
}

export const branchRepository = new BranchRepository();
