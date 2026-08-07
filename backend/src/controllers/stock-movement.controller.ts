import type { Request, Response } from "express";

import { stockMovementService } from "../services/stock-movement.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class StockMovementController {
  static async list(req: Request, res: Response) {
    const movements = await stockMovementService.list(getParam(req, "inventoryItemId"));

    return ApiResponse.success(res, movements, 200, "Stock movement history retrieved successfully.");
  }

  static async createAdjustment(req: Request, res: Response) {
    const movement = await stockMovementService.recordAdjustment(
      getParam(req, "inventoryItemId"),
      req.body,
      req.user.id
    );

    return ApiResponse.success(res, movement, 201, "Adjustment recorded successfully.");
  }

  static async createWaste(req: Request, res: Response) {
    const movement = await stockMovementService.recordWaste(
      getParam(req, "inventoryItemId"),
      req.body,
      req.user.id
    );

    return ApiResponse.success(res, movement, 201, "Waste recorded successfully.");
  }

  static async createStockCount(req: Request, res: Response) {
    const movement = await stockMovementService.recordStockCount(
      getParam(req, "inventoryItemId"),
      req.body,
      req.user.id
    );

    return ApiResponse.success(res, movement, 201, "Stock count recorded successfully.");
  }
}
