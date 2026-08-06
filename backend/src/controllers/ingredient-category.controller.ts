import type { Request, Response } from "express";

import { ingredientCategoryService } from "../services/ingredient-category.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class IngredientCategoryController {
  static async list(req: Request, res: Response) {
    const categories = await ingredientCategoryService.list(getParam(req, "restaurantId"));

    return ApiResponse.success(res, categories, 200, "Ingredient categories retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const category = await ingredientCategoryService.getById(
      getParam(req, "ingredientCategoryId")
    );

    return ApiResponse.success(res, category, 200, "Ingredient category retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const category = await ingredientCategoryService.create(
      getParam(req, "restaurantId"),
      req.body
    );

    return ApiResponse.success(res, category, 201, "Ingredient category created successfully.");
  }

  static async update(req: Request, res: Response) {
    const category = await ingredientCategoryService.update(
      getParam(req, "ingredientCategoryId"),
      req.body
    );

    return ApiResponse.success(res, category, 200, "Ingredient category updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await ingredientCategoryService.delete(getParam(req, "ingredientCategoryId"));

    return ApiResponse.success(res, null, 200, "Ingredient category deleted successfully.");
  }
}
