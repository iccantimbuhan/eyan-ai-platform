import type { Request, Response } from "express";

import { aiProviderService } from "../services/ai-provider.service.js";
import { mapAiProviderToResponse } from "../dto/ai-provider.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

// Same shape as Automation's own Health page (features/automation/
// components/health-page.tsx) — every registered AiProvider's current
// healthStatus/lastHealthCheckAt/lastHealthMessage, actively populated by
// AiProviderHealthService (TDD §14), not this controller.
export class AiHealthController {
  static async overview(_req: Request, res: Response) {
    const providers = await aiProviderService.list();
    return ApiResponse.success(res, providers.map(mapAiProviderToResponse), 200, "AI Core provider health retrieved successfully.");
  }
}
