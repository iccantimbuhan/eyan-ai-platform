import type {
  GenerateContentDto,
  ListContentQueryDto,
} from "../dto/content.dto.js";

import { ContentRepository } from "../repositories/content.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { BrandKitRepository } from "../repositories/brand-kit.repository.js";
import { AnalyticsEventRepository } from "../repositories/analytics-event.repository.js";
import { aiCapabilityService, AiCapabilityService } from "./ai-capability.service.js";
import { CONTENT_TYPE_AI_CONFIG } from "../config/content-prompts.js";
import { buildContentBrandGuidance } from "../dto/brand-kit-guidance.js";
import { NotFoundError } from "../errors/auth.error.js";
import { ApiError } from "../errors/api-error.js";
import { logger } from "../lib/logger.js";

export class ContentService {
  constructor(
    private readonly repository = new ContentRepository(),
    private readonly projectRepository = new ProjectRepository(),
    private readonly brandKitRepository = new BrandKitRepository(),
    private readonly capabilityService: AiCapabilityService = aiCapabilityService,
    private readonly analyticsEventRepository = new AnalyticsEventRepository(),
  ) {}

  async generate(data: GenerateContentDto, userId: string) {
    const project = await this.projectRepository.findById(
      data.projectId,
      userId
    );

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    let brandGuidance = "";

    if (data.brandKitId) {
      const brandKit = await this.brandKitRepository.findById(
        data.brandKitId,
        userId
      );

      if (!brandKit || brandKit.projectId !== data.projectId) {
        throw new NotFoundError("Brand kit not found.");
      }

      brandGuidance = buildContentBrandGuidance(brandKit);
    }

    // Captured for Asset Details' "Generation Time" field (Sprint 5) — pure
    // timing around the existing call, no change to control flow or errors.
    const startedAt = Date.now();

    const { capabilityKey } = CONTENT_TYPE_AI_CONFIG[data.type];
    const result = await this.capabilityService.invoke(
      capabilityKey,
      { prompt: data.prompt, brandGuidance },
      { expectJson: false },
      userId
    );

    // AiRoutingService never throws on a provider-call failure (it reports
    // outcome/needsManualReview instead — "never strand a caller") — this
    // service still needs to surface that as an error the way it always
    // has, so ContentController's existing error handling (and callers of
    // ContentService.generate()) see no behavior change.
    if (result.outcome !== "VALID") {
      throw new ApiError(503, "Unable to connect to AI provider.");
    }

    const generationTimeMs = Date.now() - startedAt;

    const created = await this.repository.create({
      projectId: data.projectId,
      brandKitId: data.brandKitId ?? null,
      type: data.type,
      prompt: data.prompt,
      output: result.output,
      model: result.model,
      createdBy: userId,
      generationTimeMs,
    });

    // Fire-and-forget: analytics must never interrupt the generation
    // workflow, and there's no invariant (unlike a file delete) requiring
    // this write to finish before responding. See ADR-0011.
    void this.analyticsEventRepository
      .create({
        projectId: data.projectId,
        assetType: data.type,
        sourceId: created.id,
        type: "GENERATED",
        actorId: userId,
        // Sourced from AI Core's own resolved chain rather than a hardcoded
        // constant, since AI Core — not this service — now decides which
        // provider serves the call (Sprint 3 Phase 2).
        provider: result.provider,
        model: result.model,
        generationTimeMs,
        brandKitId: data.brandKitId ?? null,
      })
      .catch((error) =>
        logger.error(
          `[ContentService] Failed to record analytics event for ${created.id}: ${errorMessageOf(error)}`
        )
      );

    return created;
  }

  async list(query: ListContentQueryDto, userId: string) {
    const project = await this.projectRepository.findById(
      query.projectId,
      userId
    );

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.repository.findMany({
        projectId: query.projectId,
        userId,
        skip,
        take: pageSize,
      }),
      this.repository.count(query.projectId, userId),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: string, userId: string) {
    const content = await this.repository.findById(id, userId);

    if (!content) {
      throw new NotFoundError("Generated content not found.");
    }

    return content;
  }

  async delete(id: string, userId: string) {
    await this.getById(id, userId);

    return this.repository.delete(id);
  }
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
