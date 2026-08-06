import type { Request, Response } from "express";

import { recipeIngredientService } from "../services/recipe-ingredient.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class RecipeIngredientController {
  static async list(req: Request, res: Response) {
    const lines = await recipeIngredientService.list(getParam(req, "recipeId"));

    return ApiResponse.success(res, lines, 200, "Recipe ingredients retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const line = await recipeIngredientService.getById(getParam(req, "recipeIngredientId"));

    return ApiResponse.success(res, line, 200, "Recipe ingredient retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const line = await recipeIngredientService.create(getParam(req, "recipeId"), req.body);

    return ApiResponse.success(res, line, 201, "Recipe ingredient created successfully.");
  }

  static async update(req: Request, res: Response) {
    const line = await recipeIngredientService.update(
      getParam(req, "recipeIngredientId"),
      req.body
    );

    return ApiResponse.success(res, line, 200, "Recipe ingredient updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await recipeIngredientService.delete(getParam(req, "recipeIngredientId"));

    return ApiResponse.success(res, null, 200, "Recipe ingredient deleted successfully.");
  }
}
