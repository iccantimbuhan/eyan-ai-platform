import type { Request, Response } from "express";

import { restaurantService } from "../services/restaurant.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class RestaurantController {
  static async list(req: Request, res: Response) {
    const restaurants = await restaurantService.list(getParam(req, "organizationId"));

    return ApiResponse.success(res, restaurants, 200, "Restaurants retrieved successfully.");
  }

  static async getOne(req: Request, res: Response) {
    const restaurant = await restaurantService.getById(getParam(req, "restaurantId"));

    return ApiResponse.success(res, restaurant, 200, "Restaurant retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const restaurant = await restaurantService.create(getParam(req, "organizationId"), req.body);

    return ApiResponse.success(res, restaurant, 201, "Restaurant created successfully.");
  }

  static async update(req: Request, res: Response) {
    const restaurant = await restaurantService.update(getParam(req, "restaurantId"), req.body);

    return ApiResponse.success(res, restaurant, 200, "Restaurant updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await restaurantService.delete(getParam(req, "restaurantId"));

    return ApiResponse.success(res, null, 200, "Restaurant deleted successfully.");
  }
}
