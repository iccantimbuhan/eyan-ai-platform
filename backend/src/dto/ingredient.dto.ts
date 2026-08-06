export interface CreateIngredientDto {
  name: string;
  ingredientCategoryId?: string | null;
  supplierIds?: string[];
}

export interface UpdateIngredientDto {
  name?: string;
  ingredientCategoryId?: string | null;
  supplierIds?: string[];
}

export interface IngredientSupplierSummaryDto {
  id: string;
  name: string;
}

export interface IngredientResponseDto {
  id: string;
  restaurantId: string;
  ingredientCategoryId: string | null;
  name: string;
  suppliers: IngredientSupplierSummaryDto[];
  createdAt: Date;
  updatedAt: Date;
}
