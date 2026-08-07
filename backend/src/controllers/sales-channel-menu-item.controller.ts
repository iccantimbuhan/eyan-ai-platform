import type { Request, Response } from "express";

import { salesChannelMenuItemService } from "../services/sales-channel-menu-item.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class SalesChannelMenuItemController {
  static async listByRestaurant(req: Request, res: Response) {
    const rows = await salesChannelMenuItemService.listByRestaurant(getParam(req, "restaurantId"));
    return ApiResponse.success(res, rows, 200, "Sales channel menu item prices retrieved successfully.");
  }

  static async upsert(req: Request, res: Response) {
    const row = await salesChannelMenuItemService.upsert(
      getParam(req, "itemId"),
      getParam(req, "salesChannelId"),
      req.body
    );
    return ApiResponse.success(res, row, 200, "Channel price saved successfully.");
  }

  static async remove(req: Request, res: Response) {
    await salesChannelMenuItemService.remove(getParam(req, "itemId"), getParam(req, "salesChannelId"));
    return ApiResponse.success(res, null, 200, "Channel price override removed successfully.");
  }
}
