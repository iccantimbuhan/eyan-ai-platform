import type { Request, Response } from "express";

import { recipeService } from "../services/recipe.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class RecipeController {
  static async list(req: Request, res: Response) {
    const recipes = await recipeService.list(getParam(req, "restaurantId"));

    return ApiResponse.success(res, recipes, 200, "Recipes retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const recipe = await recipeService.getById(getParam(req, "recipeId"));

    return ApiResponse.success(res, recipe, 200, "Recipe retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const recipe = await recipeService.create(getParam(req, "restaurantId"), req.body);

    return ApiResponse.success(res, recipe, 201, "Recipe created successfully.");
  }

  static async update(req: Request, res: Response) {
    const recipe = await recipeService.update(getParam(req, "recipeId"), req.body);

    return ApiResponse.success(res, recipe, 200, "Recipe updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await recipeService.delete(getParam(req, "recipeId"));

    return ApiResponse.success(res, null, 200, "Recipe deleted successfully.");
  }
}
