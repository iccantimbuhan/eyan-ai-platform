import { prisma } from "../lib/prisma.js";

const includeIngredients = {
  ingredients: { include: { ingredient: true, unit: true } },
} as const;

export class RecipeRepository {
  async findById(id: string) {
    return prisma.recipe.findUnique({ where: { id }, include: includeIngredients });
  }

  async findByMenuItemId(menuItemId: string) {
    return prisma.recipe.findUnique({ where: { menuItemId } });
  }

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.recipe.findMany({
      where: { restaurantId },
      include: includeIngredients,
      orderBy: { createdAt: "asc" },
    });
  }

  async create(data: { restaurantId: string; menuItemId: string; notes?: string | null }) {
    return prisma.recipe.create({ data, include: includeIngredients });
  }

  async update(id: string, data: { notes?: string | null }) {
    return prisma.recipe.update({ where: { id }, data, include: includeIngredients });
  }

  async delete(id: string) {
    return prisma.recipe.delete({ where: { id } });
  }
}

export const recipeRepository = new RecipeRepository();
