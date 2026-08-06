import type { Request, Response } from "express";

import { menuItemService } from "../services/menu-item.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class MenuItemController {
  static async list(req: Request, res: Response) {
    const menuCategoryId = req.query.menuCategoryId?.toString();

    const items = await menuItemService.list(getParam(req, "restaurantId"), menuCategoryId);

    return ApiResponse.success(res, items, 200, "Menu items retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const item = await menuItemService.getById(getParam(req, "itemId"));

    return ApiResponse.success(res, item, 200, "Menu item retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const item = await menuItemService.create(getParam(req, "restaurantId"), req.body);

    return ApiResponse.success(res, item, 201, "Menu item created successfully.");
  }

  static async update(req: Request, res: Response) {
    const item = await menuItemService.update(getParam(req, "itemId"), req.body);

    return ApiResponse.success(res, item, 200, "Menu item updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await menuItemService.delete(getParam(req, "itemId"));

    return ApiResponse.success(res, null, 200, "Menu item deleted successfully.");
  }
}
