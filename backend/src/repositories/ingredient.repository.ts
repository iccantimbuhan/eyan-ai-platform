import { prisma } from "../lib/prisma.js";

const includeSuppliers = {
  suppliers: { include: { supplier: true } },
} as const;

export interface CreateIngredientData {
  restaurantId: string;
  name: string;
  ingredientCategoryId?: string | null;
  supplierIds?: string[];
}

export interface UpdateIngredientData {
  name?: string;
  ingredientCategoryId?: string | null;
  supplierIds?: string[];
}

export class IngredientRepository {
  async findById(id: string) {
    return prisma.ingredient.findUnique({ where: { id }, include: includeSuppliers });
  }

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.ingredient.findMany({
      where: { restaurantId },
      include: includeSuppliers,
      orderBy: { name: "asc" },
    });
  }

  async create(data: CreateIngredientData) {
    return prisma.ingredient.create({
      data: {
        restaurantId: data.restaurantId,
        name: data.name,
        ingredientCategoryId: data.ingredientCategoryId,
        suppliers: data.supplierIds
          ? { create: data.supplierIds.map((supplierId) => ({ supplierId })) }
          : undefined,
      },
      include: includeSuppliers,
    });
  }

  async update(id: string, data: UpdateIngredientData) {
    return prisma.$transaction(async (tx) => {
      if (data.supplierIds) {
        await tx.ingredientSupplier.deleteMany({ where: { ingredientId: id } });
        if (data.supplierIds.length > 0) {
          await tx.ingredientSupplier.createMany({
            data: data.supplierIds.map((supplierId) => ({ ingredientId: id, supplierId })),
          });
        }
      }

      return tx.ingredient.update({
        where: { id },
        data: {
          name: data.name,
          ingredientCategoryId: data.ingredientCategoryId,
        },
        include: includeSuppliers,
      });
    });
  }

  async delete(id: string) {
    return prisma.ingredient.delete({ where: { id } });
  }
}

export const ingredientRepository = new IngredientRepository();
