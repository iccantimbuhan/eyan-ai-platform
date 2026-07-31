import type { Request, Response } from "express";

import { aiRoutingPolicyService } from "../services/ai-routing-policy.service.js";
import { mapAiRoutingPolicyToResponse } from "../dto/ai-routing-policy.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

export class AiRoutingPolicyController {
  static async create(req: Request, res: Response) {
    const policy = await aiRoutingPolicyService.create(
      {
        brainId: req.params.brainId as string,
        strategy: req.body.strategy,
        requiredTag: req.body.requiredTag ?? null,
        preferredProviderId: req.body.preferredProviderId,
        preferredModelId: req.body.preferredModelId,
        fallbackProviderId: req.body.fallbackProviderId ?? null,
        fallbackModelId: req.body.fallbackModelId ?? null,
        maxRetries: req.body.maxRetries,
        timeoutMs: req.body.timeoutMs,
        confidenceHighThreshold: req.body.confidenceHighThreshold,
        confidenceMediumThreshold: req.body.confidenceMediumThreshold,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiRoutingPolicyToResponse(policy), 201, "Routing policy created successfully.");
  }

  static async list(req: Request, res: Response) {
    const policies = await aiRoutingPolicyService.listByBrain(req.params.brainId as string);
    return ApiResponse.success(res, policies.map(mapAiRoutingPolicyToResponse), 200, "Routing policies retrieved successfully.");
  }

  static async activate(req: Request, res: Response) {
    await aiRoutingPolicyService.activate(req.params.brainId as string, req.params.policyId as string, req.user.id);
    return ApiResponse.success(res, null, 200, "Routing policy activated successfully.");
  }
}
