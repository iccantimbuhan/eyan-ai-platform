import type { Request, Response } from "express";
import { ModelService } from "../services/model.service.js";
import { ApiResponse } from "../utils/api-response.js";

export class ModelController {
  static async getModels(_req: Request, res: Response) {
    const service = new ModelService();

    const models = await service.getModels();

    return ApiResponse.success(res, {
      count: models.length,
      models,
    });
  }
}