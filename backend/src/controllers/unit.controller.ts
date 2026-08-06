import type { Request, Response } from "express";

import { unitService } from "../services/unit.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class UnitController {
  static async list(req: Request, res: Response) {
    const units = await unitService.list(getParam(req, "restaurantId"));

    return ApiResponse.success(res, units, 200, "Units retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const unit = await unitService.getById(getParam(req, "unitId"));

    return ApiResponse.success(res, unit, 200, "Unit retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const unit = await unitService.create(getParam(req, "restaurantId"), req.body);

    return ApiResponse.success(res, unit, 201, "Unit created successfully.");
  }

  static async update(req: Request, res: Response) {
    const unit = await unitService.update(getParam(req, "unitId"), req.body);

    return ApiResponse.success(res, unit, 200, "Unit updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await unitService.delete(getParam(req, "unitId"));

    return ApiResponse.success(res, null, 200, "Unit deleted successfully.");
  }
}
