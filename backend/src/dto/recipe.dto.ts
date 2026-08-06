export interface CreateRecipeDto {
  menuItemId: string;
  notes?: string | null;
}

export interface UpdateRecipeDto {
  notes?: string | null;
}

export interface RecipeIngredientLineDto {
  id: string;
  ingredientId: string;
  ingredientName: string;
  unitId: string;
  unitAbbreviation: string;
  quantity: string;
}

export interface RecipeResponseDto {
  id: string;
  restaurantId: string;
  menuItemId: string;
  notes: string | null;
  ingredients: RecipeIngredientLineDto[];
  createdAt: Date;
  updatedAt: Date;
}
