import type { IngredientCategory } from "../generated/prisma/client.js";
import type { IngredientCategoryResponseDto } from "./ingredient-category.dto.js";

export function mapIngredientCategoryToResponse(
  row: IngredientCategory
): IngredientCategoryResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
