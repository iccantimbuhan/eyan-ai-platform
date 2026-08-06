import { prisma } from "../lib/prisma.js";

export class IngredientCategoryRepository {
  async findById(id: string) {
    return prisma.ingredientCategory.findUnique({ where: { id } });
  }

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.ingredientCategory.findMany({
      where: { restaurantId },
      orderBy: { name: "asc" },
    });
  }

  async create(data: { restaurantId: string; name: string }) {
    return prisma.ingredientCategory.create({ data });
  }

  async update(id: string, data: { name?: string }) {
    return prisma.ingredientCategory.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.ingredientCategory.delete({ where: { id } });
  }
}

export const ingredientCategoryRepository = new IngredientCategoryRepository();
