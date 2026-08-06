export interface CreateIngredientCategoryDto {
  name: string;
}

export interface UpdateIngredientCategoryDto {
  name?: string;
}

export interface IngredientCategoryResponseDto {
  id: string;
  restaurantId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
