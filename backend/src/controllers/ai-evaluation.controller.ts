import type { Request, Response } from "express";

import { aiEvaluationService } from "../services/ai-evaluation.service.js";
import { mapAiEvaluationToResponse } from "../dto/ai-evaluation.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

export class AiEvaluationController {
  static async run(req: Request, res: Response) {
    const evaluation = await aiEvaluationService.run(
      {
        promptId: req.body.promptId,
        testCaseName: req.body.testCaseName,
        input: req.body.input,
        expectedShape: req.body.expectedShape,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiEvaluationToResponse(evaluation), 201, "Evaluation completed.");
  }

  static async listByPrompt(req: Request, res: Response) {
    const evaluations = await aiEvaluationService.listByPrompt(req.params.promptId as string);
    return ApiResponse.success(res, evaluations.map(mapAiEvaluationToResponse), 200, "Evaluations retrieved successfully.");
  }
}
