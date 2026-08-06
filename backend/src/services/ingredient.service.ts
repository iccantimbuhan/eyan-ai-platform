import { ingredientRepository, IngredientRepository } from "../repositories/ingredient.repository.js";
import {
  ingredientCategoryRepository,
  IngredientCategoryRepository,
} from "../repositories/ingredient-category.repository.js";
import {
  supplierRepository as defaultSupplierRepository,
  SupplierRepository,
} from "../repositories/supplier.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { RestaurantProductScopeMismatchError } from "../errors/restaurant-product.error.js";
import { mapIngredientToResponse } from "../dto/ingredient.mapper.js";
import type { CreateIngredientDto, UpdateIngredientDto } from "../dto/ingredient.dto.js";

export class IngredientService {
  constructor(
    private readonly repository: IngredientRepository = ingredientRepository,
    private readonly categoryRepository: IngredientCategoryRepository = ingredientCategoryRepository,
    private readonly supplierRepository: SupplierRepository = defaultSupplierRepository
  ) {}

  async list(restaurantId: string) {
    const ingredients = await this.repository.findManyByRestaurantId(restaurantId);
    return ingredients.map(mapIngredientToResponse);
  }

  async getById(id: string) {
    const ingredient = await this.repository.findById(id);

    if (!ingredient) {
      throw new NotFoundError("Ingredient not found.");
    }

    return mapIngredientToResponse(ingredient);
  }

  // Client-supplied ingredientCategoryId/supplierIds are never trusted
  // without re-verifying they belong to the already-authorized restaurant —
  // the route only proves the :restaurantId in the URL is authorized, not
  // any ids inside the request body. Mirrors MenuItemService's
  // assertCategoryBelongsToRestaurant.
  private async assertCategoryBelongsToRestaurant(restaurantId: string, categoryId: string) {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category || category.restaurantId !== restaurantId) {
      throw new RestaurantProductScopeMismatchError(
        "This ingredient category does not belong to the given restaurant."
      );
    }
  }

  private async assertSuppliersBelongToRestaurant(restaurantId: string, supplierIds: string[]) {
    if (supplierIds.length === 0) return;

    const suppliers = await this.supplierRepository.findManyByIds(supplierIds);

    const validIds = new Set(
      suppliers.filter((s) => s.restaurantId === restaurantId).map((s) => s.id)
    );

    if (validIds.size !== supplierIds.length) {
      throw new RestaurantProductScopeMismatchError(
        "One or more suppliers do not belong to the given restaurant."
      );
    }
  }

  async create(restaurantId: string, data: CreateIngredientDto) {
    if (data.ingredientCategoryId) {
      await this.assertCategoryBelongsToRestaurant(restaurantId, data.ingredientCategoryId);
    }

    if (data.supplierIds) {
      await this.assertSuppliersBelongToRestaurant(restaurantId, data.supplierIds);
    }

    const ingredient = await this.repository.create({
      restaurantId,
      name: data.name,
      ingredientCategoryId: data.ingredientCategoryId,
      supplierIds: data.supplierIds,
    });

    return mapIngredientToResponse(ingredient);
  }

  async update(id: string, data: UpdateIngredientDto) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundError("Ingredient not found.");
    }

    if (data.ingredientCategoryId) {
      await this.assertCategoryBelongsToRestaurant(existing.restaurantId, data.ingredientCategoryId);
    }

    if (data.supplierIds) {
      await this.assertSuppliersBelongToRestaurant(existing.restaurantId, data.supplierIds);
    }

    const ingredient = await this.repository.update(id, {
      name: data.name,
      ingredientCategoryId: data.ingredientCategoryId,
      supplierIds: data.supplierIds,
    });

    return mapIngredientToResponse(ingredient);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.repository.delete(id);
  }
}

export const ingredientService = new IngredientService();
