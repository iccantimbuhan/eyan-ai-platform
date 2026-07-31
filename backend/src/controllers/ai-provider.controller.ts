import type { Request, Response } from "express";

import { aiProviderService } from "../services/ai-provider.service.js";
import { aiProviderHealthService } from "../services/ai-provider-health.service.js";
import { AiCoreProviderFactory } from "../providers/ai-core-provider.factory.js";
import { mapAiProviderCredentialToResponse, mapAiProviderToResponse } from "../dto/ai-provider.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

export class AiProviderController {
  // Registered AiCoreProviderFactory keys ("ollama","openai","anthropic",
  // "gemini") — lets the frontend populate a provider-kind picker before
  // registering a new AiProvider row, same purpose as
  // McpServerConfigController.listProviders.
  static async listRegisteredPlugins(_req: Request, res: Response) {
    return ApiResponse.success(res, AiCoreProviderFactory.listRegistered(), 200, "Registered AI Core provider plugins retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const provider = await aiProviderService.create(
      {
        key: req.body.key,
        displayName: req.body.displayName,
        kind: req.body.kind,
        baseUrl: req.body.baseUrl ?? null,
        isEnabled: req.body.isEnabled,
        rateLimitPerMinute: req.body.rateLimitPerMinute ?? null,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiProviderToResponse(provider), 201, "AI Core provider created successfully.");
  }

  static async list(_req: Request, res: Response) {
    const providers = await aiProviderService.list();
    return ApiResponse.success(res, providers.map(mapAiProviderToResponse), 200, "AI Core providers retrieved successfully.");
  }

  static async getById(req: Request, res: Response) {
    const provider = await aiProviderService.getById(req.params.id as string);
    return ApiResponse.success(res, mapAiProviderToResponse(provider), 200, "AI Core provider retrieved successfully.");
  }

  static async update(req: Request, res: Response) {
    const provider = await aiProviderService.update(
      req.params.id as string,
      {
        displayName: req.body.displayName,
        baseUrl: req.body.baseUrl,
        isEnabled: req.body.isEnabled,
        rateLimitPerMinute: req.body.rateLimitPerMinute,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiProviderToResponse(provider), 200, "AI Core provider updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await aiProviderService.delete(req.params.id as string, req.user.id);
    return ApiResponse.success(res, null, 200, "AI Core provider removed successfully.");
  }

  static async addCredential(req: Request, res: Response) {
    const credential = await aiProviderService.addCredential(
      { providerId: req.params.id as string, label: req.body.label, credentials: req.body.credentials },
      req.user.id
    );

    return ApiResponse.success(res, mapAiProviderCredentialToResponse(credential), 201, "Credential added successfully.");
  }

  static async rotateCredential(req: Request, res: Response) {
    const credential = await aiProviderService.rotateCredential(req.params.credentialId as string, req.body.credentials, req.user.id);
    return ApiResponse.success(res, mapAiProviderCredentialToResponse(credential), 200, "Credential rotated successfully.");
  }

  static async checkHealth(req: Request, res: Response) {
    const result = await aiProviderHealthService.checkHealth(req.params.id as string, req.user.id);
    return ApiResponse.success(res, result, 200, "Health check completed.");
  }
}
