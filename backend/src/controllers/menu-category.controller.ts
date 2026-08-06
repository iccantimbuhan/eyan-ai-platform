import type { Request, Response } from "express";

import { menuCategoryService } from "../services/menu-category.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class MenuCategoryController {
  static async list(req: Request, res: Response) {
    const categories = await menuCategoryService.list(getParam(req, "restaurantId"));

    return ApiResponse.success(res, categories, 200, "Menu categories retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const category = await menuCategoryService.getById(getParam(req, "categoryId"));

    return ApiResponse.success(res, category, 200, "Menu category retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const category = await menuCategoryService.create(getParam(req, "restaurantId"), req.body);

    return ApiResponse.success(res, category, 201, "Menu category created successfully.");
  }

  static async update(req: Request, res: Response) {
    const category = await menuCategoryService.update(getParam(req, "categoryId"), req.body);

    return ApiResponse.success(res, category, 200, "Menu category updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await menuCategoryService.delete(getParam(req, "categoryId"));

    return ApiResponse.success(res, null, 200, "Menu category deleted successfully.");
  }
}
