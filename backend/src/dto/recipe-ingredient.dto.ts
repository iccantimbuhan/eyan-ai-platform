export interface CreateRecipeIngredientDto {
  ingredientId: string;
  unitId: string;
  quantity: number | string;
}

export interface UpdateRecipeIngredientDto {
  ingredientId?: string;
  unitId?: string;
  quantity?: number | string;
}

export interface RecipeIngredientResponseDto {
  id: string;
  restaurantId: string;
  recipeId: string;
  ingredientId: string;
  ingredientName: string;
  unitId: string;
  unitAbbreviation: string;
  quantity: string;
  createdAt: Date;
  updatedAt: Date;
}
