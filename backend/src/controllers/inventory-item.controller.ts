import type { Request, Response } from "express";

import { inventoryItemService } from "../services/inventory-item.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class InventoryItemController {
  static async list(req: Request, res: Response) {
    const items = await inventoryItemService.list(getParam(req, "branchId"));

    return ApiResponse.success(res, items, 200, "Inventory items retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const item = await inventoryItemService.getById(getParam(req, "inventoryItemId"));

    return ApiResponse.success(res, item, 200, "Inventory item retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const item = await inventoryItemService.create(
      getParam(req, "branchId"),
      req.body,
      req.user.id
    );

    return ApiResponse.success(res, item, 201, "Inventory item created successfully.");
  }

  static async update(req: Request, res: Response) {
    const item = await inventoryItemService.update(getParam(req, "inventoryItemId"), req.body);

    return ApiResponse.success(res, item, 200, "Inventory item updated successfully.");
  }
}
