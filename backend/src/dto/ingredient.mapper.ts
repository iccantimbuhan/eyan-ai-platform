import type { Ingredient, IngredientSupplier, Supplier } from "../generated/prisma/client.js";
import type { IngredientResponseDto } from "./ingredient.dto.js";

type IngredientWithSuppliers = Ingredient & {
  suppliers: (IngredientSupplier & { supplier: Supplier })[];
};

export function mapIngredientToResponse(row: IngredientWithSuppliers): IngredientResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    ingredientCategoryId: row.ingredientCategoryId,
    name: row.name,
    suppliers: row.suppliers.map((link) => ({
      id: link.supplier.id,
      name: link.supplier.name,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
