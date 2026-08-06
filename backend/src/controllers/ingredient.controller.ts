import type { Request, Response } from "express";

import { ingredientService } from "../services/ingredient.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class IngredientController {
  static async list(req: Request, res: Response) {
    const ingredients = await ingredientService.list(getParam(req, "restaurantId"));

    return ApiResponse.success(res, ingredients, 200, "Ingredients retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const ingredient = await ingredientService.getById(getParam(req, "ingredientId"));

    return ApiResponse.success(res, ingredient, 200, "Ingredient retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const ingredient = await ingredientService.create(getParam(req, "restaurantId"), req.body);

    return ApiResponse.success(res, ingredient, 201, "Ingredient created successfully.");
  }

  static async update(req: Request, res: Response) {
    const ingredient = await ingredientService.update(getParam(req, "ingredientId"), req.body);

    return ApiResponse.success(res, ingredient, 200, "Ingredient updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await ingredientService.delete(getParam(req, "ingredientId"));

    return ApiResponse.success(res, null, 200, "Ingredient deleted successfully.");
  }
}
