import type { Request, Response } from "express";

import { PromptTemplateService } from "../services/prompt-template.service.js";
import { ApiResponse } from "../utils/api-response.js";
import type { ContentType } from "../generated/prisma/enums.js";

const promptTemplateService = new PromptTemplateService();

export class PromptTemplateController {
  static async getTemplates(req: Request, res: Response) {
    const templates = await promptTemplateService.list({
      category: req.query.category as string | undefined,
      contentType: req.query.contentType as ContentType | undefined,
    });

    return ApiResponse.success(
      res,
      templates,
      200,
      "Prompt templates retrieved successfully."
    );
  }
}
