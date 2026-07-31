import type { Request, Response } from "express";

import { aiModelService } from "../services/ai-model.service.js";
import { mapAiModelToResponse } from "../dto/ai-model.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

export class AiModelController {
  static async create(req: Request, res: Response) {
    const model = await aiModelService.create(
      {
        providerId: req.body.providerId,
        modelKey: req.body.modelKey,
        displayName: req.body.displayName,
        tags: req.body.tags,
        contextWindow: req.body.contextWindow ?? null,
        costPerInputToken: req.body.costPerInputToken ?? null,
        costPerOutputToken: req.body.costPerOutputToken ?? null,
        isEnabled: req.body.isEnabled,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiModelToResponse(model), 201, "AI Model created successfully.");
  }

  static async list(req: Request, res: Response) {
    const models = req.query.providerId
      ? await aiModelService.listByProvider(req.query.providerId as string)
      : await aiModelService.list();

    return ApiResponse.success(res, models.map(mapAiModelToResponse), 200, "AI Models retrieved successfully.");
  }

  static async getById(req: Request, res: Response) {
    const model = await aiModelService.getById(req.params.id as string);
    return ApiResponse.success(res, mapAiModelToResponse(model), 200, "AI Model retrieved successfully.");
  }

  static async update(req: Request, res: Response) {
    const model = await aiModelService.update(
      req.params.id as string,
      {
        displayName: req.body.displayName,
        tags: req.body.tags,
        contextWindow: req.body.contextWindow,
        costPerInputToken: req.body.costPerInputToken,
        costPerOutputToken: req.body.costPerOutputToken,
        isEnabled: req.body.isEnabled,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiModelToResponse(model), 200, "AI Model updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await aiModelService.delete(req.params.id as string, req.user.id);
    return ApiResponse.success(res, null, 200, "AI Model removed successfully.");
  }
}
