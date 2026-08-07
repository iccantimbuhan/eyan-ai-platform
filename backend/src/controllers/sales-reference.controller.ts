import type { Request, Response } from "express";

import {
  salesChannelService,
  salesCategoryService,
  salesPaymentMethodService,
} from "../services/sales-reference.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class SalesChannelController {
  static async list(req: Request, res: Response) {
    const rows = await salesChannelService.list(getParam(req, "restaurantId"));
    return ApiResponse.success(res, rows, 200, "Sales channels retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const row = await salesChannelService.create(getParam(req, "restaurantId"), req.body);
    return ApiResponse.success(res, row, 201, "Sales channel created successfully.");
  }
}

export class SalesPaymentMethodController {
  static async list(req: Request, res: Response) {
    const rows = await salesPaymentMethodService.list(getParam(req, "restaurantId"));
    return ApiResponse.success(res, rows, 200, "Sales payment methods retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const row = await salesPaymentMethodService.create(getParam(req, "restaurantId"), req.body);
    return ApiResponse.success(res, row, 201, "Sales payment method created successfully.");
  }
}

export class SalesCategoryController {
  static async list(req: Request, res: Response) {
    const rows = await salesCategoryService.list(getParam(req, "restaurantId"));
    return ApiResponse.success(res, rows, 200, "Sales categories retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const row = await salesCategoryService.create(getParam(req, "restaurantId"), req.body);
    return ApiResponse.success(res, row, 201, "Sales category created successfully.");
  }
}
