import { prisma } from "../lib/prisma.js";

export class MenuCategoryRepository {
  async findById(id: string) {
    return prisma.menuCategory.findUnique({ where: { id } });
  }

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async create(data: { restaurantId: string; name: string; displayOrder?: number }) {
    return prisma.menuCategory.create({ data });
  }

  async update(id: string, data: { name?: string; displayOrder?: number }) {
    return prisma.menuCategory.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.menuCategory.delete({ where: { id } });
  }
}

export const menuCategoryRepository = new MenuCategoryRepository();
