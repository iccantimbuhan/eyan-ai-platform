import type { Ingredient, RecipeIngredient, Unit } from "../generated/prisma/client.js";
import type { RecipeIngredientResponseDto } from "./recipe-ingredient.dto.js";

type RecipeIngredientWithRefs = RecipeIngredient & { ingredient: Ingredient; unit: Unit };

// Decimal -> string boundary conversion happens only here, same convention
// as recipe.mapper.ts / menu-item.mapper.ts: .toFixed(2).
export function mapRecipeIngredientToResponse(
  row: RecipeIngredientWithRefs
): RecipeIngredientResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    recipeId: row.recipeId,
    ingredientId: row.ingredientId,
    ingredientName: row.ingredient.name,
    unitId: row.unitId,
    unitAbbreviation: row.unit.abbreviation,
    quantity: row.quantity.toFixed(2),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
