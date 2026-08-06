import type { Request, Response } from "express";

import { branchService } from "../services/branch.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class BranchController {
  static async list(req: Request, res: Response) {
    const branches = await branchService.list(getParam(req, "restaurantId"));

    return ApiResponse.success(res, branches, 200, "Branches retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const branch = await branchService.getById(getParam(req, "branchId"));

    return ApiResponse.success(res, branch, 200, "Branch retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const branch = await branchService.create(getParam(req, "restaurantId"), req.body);

    return ApiResponse.success(res, branch, 201, "Branch created successfully.");
  }

  static async update(req: Request, res: Response) {
    const branch = await branchService.update(getParam(req, "branchId"), req.body);

    return ApiResponse.success(res, branch, 200, "Branch updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await branchService.delete(getParam(req, "branchId"));

    return ApiResponse.success(res, null, 200, "Branch deleted successfully.");
  }
}
