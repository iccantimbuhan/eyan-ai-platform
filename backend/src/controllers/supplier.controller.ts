import type { Request, Response } from "express";

import { supplierService } from "../services/supplier.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class SupplierController {
  static async list(req: Request, res: Response) {
    const suppliers = await supplierService.list(getParam(req, "restaurantId"));

    return ApiResponse.success(res, suppliers, 200, "Suppliers retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const supplier = await supplierService.getById(getParam(req, "supplierId"));

    return ApiResponse.success(res, supplier, 200, "Supplier retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const supplier = await supplierService.create(getParam(req, "restaurantId"), req.body);

    return ApiResponse.success(res, supplier, 201, "Supplier created successfully.");
  }

  static async update(req: Request, res: Response) {
    const supplier = await supplierService.update(getParam(req, "supplierId"), req.body);

    return ApiResponse.success(res, supplier, 200, "Supplier updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await supplierService.delete(getParam(req, "supplierId"));

    return ApiResponse.success(res, null, 200, "Supplier deleted successfully.");
  }
}
