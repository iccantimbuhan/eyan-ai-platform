import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

const includeRefs = { ingredient: true, unit: true } as const;

export interface CreateRecipeIngredientData {
  restaurantId: string;
  recipeId: string;
  ingredientId: string;
  unitId: string;
  quantity: Prisma.Decimal | string | number;
}

export interface UpdateRecipeIngredientData {
  ingredientId?: string;
  unitId?: string;
  quantity?: Prisma.Decimal | string | number;
}

export class RecipeIngredientRepository {
  async findById(id: string) {
    return prisma.recipeIngredient.findUnique({ where: { id }, include: includeRefs });
  }

  async findByRecipeAndIngredient(recipeId: string, ingredientId: string) {
    return prisma.recipeIngredient.findUnique({
      where: { recipeId_ingredientId: { recipeId, ingredientId } },
    });
  }

  async findManyByRecipeId(recipeId: string) {
    return prisma.recipeIngredient.findMany({
      where: { recipeId },
      include: includeRefs,
      orderBy: { createdAt: "asc" },
    });
  }

  async create(data: CreateRecipeIngredientData) {
    return prisma.recipeIngredient.create({ data, include: includeRefs });
  }

  async update(id: string, data: UpdateRecipeIngredientData) {
    return prisma.recipeIngredient.update({ where: { id }, data, include: includeRefs });
  }

  async delete(id: string) {
    return prisma.recipeIngredient.delete({ where: { id } });
  }
}

export const recipeIngredientRepository = new RecipeIngredientRepository();
