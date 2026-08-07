import type { Request, Response } from "express";

import {
  salesCategoryEntryService,
  salesChannelEntryService,
  salesItemEntryService,
  salesPaymentMethodEntryService,
} from "../services/sales-entry.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class SalesChannelEntryController {
  static async create(req: Request, res: Response) {
    const entry = await salesChannelEntryService.create(getParam(req, "salesId"), req.body);
    return ApiResponse.success(res, entry, 201, "Channel entry recorded successfully.");
  }

  static async remove(req: Request, res: Response) {
    await salesChannelEntryService.delete(getParam(req, "salesId"), getParam(req, "entryId"));
    return ApiResponse.success(res, null, 200, "Channel entry deleted successfully.");
  }
}

export class SalesPaymentMethodEntryController {
  static async create(req: Request, res: Response) {
    const entry = await salesPaymentMethodEntryService.create(getParam(req, "salesId"), req.body);
    return ApiResponse.success(res, entry, 201, "Payment method entry recorded successfully.");
  }

  static async remove(req: Request, res: Response) {
    await salesPaymentMethodEntryService.delete(getParam(req, "salesId"), getParam(req, "entryId"));
    return ApiResponse.success(res, null, 200, "Payment method entry deleted successfully.");
  }
}

export class SalesCategoryEntryController {
  static async create(req: Request, res: Response) {
    const entry = await salesCategoryEntryService.create(getParam(req, "salesId"), req.body);
    return ApiResponse.success(res, entry, 201, "Category entry recorded successfully.");
  }

  static async remove(req: Request, res: Response) {
    await salesCategoryEntryService.delete(getParam(req, "salesId"), getParam(req, "entryId"));
    return ApiResponse.success(res, null, 200, "Category entry deleted successfully.");
  }
}

export class SalesItemEntryController {
  static async create(req: Request, res: Response) {
    const entry = await salesItemEntryService.create(getParam(req, "salesId"), req.body);
    return ApiResponse.success(res, entry, 201, "Item entry recorded successfully.");
  }

  static async remove(req: Request, res: Response) {
    await salesItemEntryService.delete(getParam(req, "salesId"), getParam(req, "entryId"));
    return ApiResponse.success(res, null, 200, "Item entry deleted successfully.");
  }
}
