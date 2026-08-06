import {
  recipeIngredientRepository,
  RecipeIngredientRepository,
} from "../repositories/recipe-ingredient.repository.js";
import {
  recipeRepository as defaultRecipeRepository,
  RecipeRepository,
} from "../repositories/recipe.repository.js";
import {
  ingredientRepository as defaultIngredientRepository,
  IngredientRepository,
} from "../repositories/ingredient.repository.js";
import {
  unitRepository as defaultUnitRepository,
  UnitRepository,
} from "../repositories/unit.repository.js";
import { ConflictError, NotFoundError } from "../errors/auth.error.js";
import { RestaurantProductScopeMismatchError } from "../errors/restaurant-product.error.js";
import { mapRecipeIngredientToResponse } from "../dto/recipe-ingredient.mapper.js";
import type {
  CreateRecipeIngredientDto,
  UpdateRecipeIngredientDto,
} from "../dto/recipe-ingredient.dto.js";

export class RecipeIngredientService {
  constructor(
    private readonly repository: RecipeIngredientRepository = recipeIngredientRepository,
    private readonly recipeRepository: RecipeRepository = defaultRecipeRepository,
    private readonly ingredientRepository: IngredientRepository = defaultIngredientRepository,
    private readonly unitRepository: UnitRepository = defaultUnitRepository
  ) {}

  async list(recipeId: string) {
    const lines = await this.repository.findManyByRecipeId(recipeId);
    return lines.map(mapRecipeIngredientToResponse);
  }

  async getById(id: string) {
    const line = await this.repository.findById(id);

    if (!line) {
      throw new NotFoundError("Recipe ingredient not found.");
    }

    return mapRecipeIngredientToResponse(line);
  }

  // recipeId is already authorized by requireRecipeAccess at the route, but
  // ingredientId/unitId are client-supplied and could otherwise point at a
  // row under a different Restaurant. Mirrors MenuItemService's
  // assertCategoryBelongsToRestaurant.
  private async assertBelongsToRestaurant(restaurantId: string, ingredientId: string, unitId: string) {
    const [ingredient, unit] = await Promise.all([
      this.ingredientRepository.findById(ingredientId),
      this.unitRepository.findById(unitId),
    ]);

    if (!ingredient || ingredient.restaurantId !== restaurantId) {
      throw new RestaurantProductScopeMismatchError(
        "This ingredient does not belong to the given restaurant."
      );
    }

    if (!unit || unit.restaurantId !== restaurantId) {
      throw new RestaurantProductScopeMismatchError(
        "This unit does not belong to the given restaurant."
      );
    }
  }

  async create(recipeId: string, data: CreateRecipeIngredientDto) {
    const recipe = await this.recipeRepository.findById(recipeId);

    if (!recipe) {
      throw new NotFoundError("Recipe not found.");
    }

    await this.assertBelongsToRestaurant(recipe.restaurantId, data.ingredientId, data.unitId);

    const existing = await this.repository.findByRecipeAndIngredient(recipeId, data.ingredientId);
    if (existing) {
      throw new ConflictError("This ingredient is already on the recipe.");
    }

    const line = await this.repository.create({
      restaurantId: recipe.restaurantId,
      recipeId,
      ingredientId: data.ingredientId,
      unitId: data.unitId,
      quantity: data.quantity,
    });

    return mapRecipeIngredientToResponse(line);
  }

  async update(id: string, data: UpdateRecipeIngredientDto) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundError("Recipe ingredient not found.");
    }

    const ingredientId = data.ingredientId ?? existing.ingredientId;
    const unitId = data.unitId ?? existing.unitId;

    if (data.ingredientId || data.unitId) {
      await this.assertBelongsToRestaurant(existing.restaurantId, ingredientId, unitId);
    }

    if (data.ingredientId && data.ingredientId !== existing.ingredientId) {
      const duplicate = await this.repository.findByRecipeAndIngredient(
        existing.recipeId,
        data.ingredientId
      );
      if (duplicate) {
        throw new ConflictError("This ingredient is already on the recipe.");
      }
    }

    const line = await this.repository.update(id, {
      ingredientId: data.ingredientId,
      unitId: data.unitId,
      quantity: data.quantity,
    });

    return mapRecipeIngredientToResponse(line);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.repository.delete(id);
  }
}

export const recipeIngredientService = new RecipeIngredientService();
