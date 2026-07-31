import type { Request, Response } from "express";

import { aiPromptService } from "../services/ai-prompt.service.js";
import { mapAiPromptToResponse } from "../dto/ai-prompt.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

export class AiPromptController {
  static async create(req: Request, res: Response) {
    const prompt = await aiPromptService.createVersion(
      { brainId: req.params.brainId as string, version: req.body.version, body: req.body.body },
      req.user.id
    );

    return ApiResponse.success(res, mapAiPromptToResponse(prompt), 201, "Prompt version created successfully.");
  }

  static async list(req: Request, res: Response) {
    const prompts = await aiPromptService.listByBrain(req.params.brainId as string);
    return ApiResponse.success(res, prompts.map(mapAiPromptToResponse), 200, "Prompt versions retrieved successfully.");
  }

  static async activate(req: Request, res: Response) {
    await aiPromptService.activate(req.params.brainId as string, req.params.promptId as string, req.user.id);
    return ApiResponse.success(res, null, 200, "Prompt version activated successfully.");
  }
}
