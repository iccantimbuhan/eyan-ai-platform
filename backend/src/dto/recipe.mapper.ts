import type { Ingredient, Recipe, RecipeIngredient, Unit } from "../generated/prisma/client.js";
import type { RecipeResponseDto } from "./recipe.dto.js";

type RecipeWithIngredients = Recipe & {
  ingredients: (RecipeIngredient & { ingredient: Ingredient; unit: Unit })[];
};

// Decimal -> string boundary conversion happens only here, same convention
// as menu-item.mapper.ts / finance-expense.mapper.ts: .toFixed(2).
export function mapRecipeToResponse(row: RecipeWithIngredients): RecipeResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    menuItemId: row.menuItemId,
    notes: row.notes,
    ingredients: row.ingredients.map((line) => ({
      id: line.id,
      ingredientId: line.ingredientId,
      ingredientName: line.ingredient.name,
      unitId: line.unitId,
      unitAbbreviation: line.unit.abbreviation,
      quantity: line.quantity.toFixed(2),
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
