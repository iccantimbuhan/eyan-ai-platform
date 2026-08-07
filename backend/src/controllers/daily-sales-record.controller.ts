import type { Request, Response } from "express";

import { dailySalesRecordService } from "../services/daily-sales-record.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class DailySalesRecordController {
  static async list(req: Request, res: Response) {
    const rows = await dailySalesRecordService.list(getParam(req, "branchId"));
    return ApiResponse.success(res, rows, 200, "Sales records retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const row = await dailySalesRecordService.getById(getParam(req, "salesId"));
    return ApiResponse.success(res, row, 200, "Sales record retrieved successfully.");
  }

  static async getDaily(req: Request, res: Response) {
    const date = String(req.query.date);
    const row = await dailySalesRecordService.getDaily(getParam(req, "branchId"), date);
    return ApiResponse.success(res, row, 200, "Daily sales retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const row = await dailySalesRecordService.create(getParam(req, "branchId"), req.body, req.user.id);
    return ApiResponse.success(res, row, 201, "Sales record created successfully.");
  }

  static async update(req: Request, res: Response) {
    const row = await dailySalesRecordService.update(getParam(req, "salesId"), req.body);
    return ApiResponse.success(res, row, 200, "Sales record updated successfully.");
  }
}
