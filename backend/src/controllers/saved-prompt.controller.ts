import type { Request, Response } from "express";

import { SavedPromptService } from "../services/saved-prompt.service.js";
import { ApiResponse } from "../utils/api-response.js";

const savedPromptService = new SavedPromptService();

export class SavedPromptController {
  static async createSavedPrompt(req: Request, res: Response) {
    const prompt = await savedPromptService.create(req.body, req.user.id);

    return ApiResponse.success(
      res,
      prompt,
      201,
      "Saved prompt created successfully."
    );
  }

  static async getSavedPrompts(req: Request, res: Response) {
    const prompts = await savedPromptService.list(req.user.id);

    return ApiResponse.success(
      res,
      prompts,
      200,
      "Saved prompts retrieved successfully."
    );
  }

  static async getSavedPrompt(req: Request, res: Response) {
    const prompt = await savedPromptService.getById(
      req.params.id as string,
      req.user.id
    );

    return ApiResponse.success(
      res,
      prompt,
      200,
      "Saved prompt retrieved successfully."
    );
  }

  static async updateSavedPrompt(req: Request, res: Response) {
    const prompt = await savedPromptService.update(
      req.params.id as string,
      req.body,
      req.user.id
    );

    return ApiResponse.success(
      res,
      prompt,
      200,
      "Saved prompt updated successfully."
    );
  }

  static async deleteSavedPrompt(req: Request, res: Response) {
    await savedPromptService.delete(req.params.id as string, req.user.id);

    return ApiResponse.success(
      res,
      null,
      200,
      "Saved prompt deleted successfully."
    );
  }
}
