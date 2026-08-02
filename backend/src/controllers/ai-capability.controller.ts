import type { Request, Response } from "express";

import { aiCapabilityService } from "../services/ai-capability.service.js";
import { mapAiCapabilityToResponse } from "../dto/ai-capability.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

export class AiCapabilityController {
  // Human-JWT path: authenticated + requirePermission("aicore"). Frozen —
  // see ADR-0021. The AUTOMATION_SERVICE_API_KEY-authenticated variant for
  // n8n (Phase 3, Sprint 5) is invokeService() below, mounted on a separate
  // route group (ai-core-service.routes.ts), mirroring how CRM's own
  // /crm/service/* routes were added alongside /crm/* rather than folded in
  // (ADR-0019).
  static async invoke(req: Request, res: Response) {
    const result = await aiCapabilityService.invoke(
      req.params.capabilityKey as string,
      req.body.input,
      req.body.context ?? {},
      req.user.id
    );

    return ApiResponse.success(res, result, 200, "AI Capability invoked successfully.");
  }

  // Phase 3 (ADR-0021) — same invoke() call as above, but for the
  // authenticateService-gated route: no req.user (the caller is n8n, not a
  // person), so actorId is null, matching CrmAutomationIngestService's
  // n8n-triggered writes.
  static async invokeService(req: Request, res: Response) {
    const result = await aiCapabilityService.invoke(
      req.params.capabilityKey as string,
      req.body.input,
      req.body.context ?? {},
      null
    );

    return ApiResponse.success(res, result, 200, "AI Capability invoked successfully.");
  }

  static async create(req: Request, res: Response) {
    const capability = await aiCapabilityService.create(
      {
        key: req.body.key,
        name: req.body.name,
        description: req.body.description,
        brainId: req.body.brainId,
        isEnabled: req.body.isEnabled,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiCapabilityToResponse(capability), 201, "AI Capability created successfully.");
  }

  static async list(_req: Request, res: Response) {
    const capabilities = await aiCapabilityService.list();
    return ApiResponse.success(res, capabilities.map(mapAiCapabilityToResponse), 200, "AI Capabilities retrieved successfully.");
  }

  static async getById(req: Request, res: Response) {
    const capability = await aiCapabilityService.getById(req.params.id as string);
    return ApiResponse.success(res, mapAiCapabilityToResponse(capability), 200, "AI Capability retrieved successfully.");
  }

  static async update(req: Request, res: Response) {
    const capability = await aiCapabilityService.update(
      req.params.id as string,
      {
        name: req.body.name,
        description: req.body.description,
        brainId: req.body.brainId,
        isEnabled: req.body.isEnabled,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiCapabilityToResponse(capability), 200, "AI Capability updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await aiCapabilityService.delete(req.params.id as string, req.user.id);
    return ApiResponse.success(res, null, 200, "AI Capability removed successfully.");
  }
}
