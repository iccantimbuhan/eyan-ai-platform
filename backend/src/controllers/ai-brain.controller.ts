import type { Request, Response } from "express";

import { aiBrainService } from "../services/ai-brain.service.js";
import { mapAiBrainToResponse } from "../dto/ai-brain.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

// invoke() here is the administrative/Playground-only path (requirePermission
// "aicoreadmin" at the route layer, TDD §2/§6) — never the path a business
// module calls. Business traffic goes through AiCapabilityController.invoke.
export class AiBrainController {
  static async invoke(req: Request, res: Response) {
    const result = await aiBrainService.invoke(
      req.params.brainKey as string,
      req.body.input,
      req.body.context ?? {},
      req.user.id
    );

    return ApiResponse.success(res, result, 200, "AI Brain invoked successfully.");
  }

  static async create(req: Request, res: Response) {
    const brain = await aiBrainService.create(
      {
        key: req.body.key,
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        memoryStrategy: req.body.memoryStrategy,
        isEnabled: req.body.isEnabled,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiBrainToResponse(brain), 201, "AI Brain created successfully.");
  }

  static async list(_req: Request, res: Response) {
    const brains = await aiBrainService.list();
    return ApiResponse.success(res, brains.map(mapAiBrainToResponse), 200, "AI Brains retrieved successfully.");
  }

  static async getById(req: Request, res: Response) {
    const brain = await aiBrainService.getById(req.params.id as string);
    return ApiResponse.success(res, mapAiBrainToResponse(brain), 200, "AI Brain retrieved successfully.");
  }

  static async update(req: Request, res: Response) {
    const brain = await aiBrainService.update(
      req.params.id as string,
      {
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        memoryStrategy: req.body.memoryStrategy,
        isEnabled: req.body.isEnabled,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiBrainToResponse(brain), 200, "AI Brain updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await aiBrainService.delete(req.params.id as string, req.user.id);
    return ApiResponse.success(res, null, 200, "AI Brain removed successfully.");
  }
}
