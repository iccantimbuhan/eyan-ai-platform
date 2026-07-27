import type {
  GenerateContentDto,
  ListContentQueryDto,
} from "../dto/content.dto.js";

import { ContentRepository } from "../repositories/content.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { BrandKitRepository } from "../repositories/brand-kit.repository.js";
import { AnalyticsEventRepository } from "../repositories/analytics-event.repository.js";
import { ChatService } from "./chat.service.js";
import { CONTENT_SYSTEM_PROMPTS } from "../config/content-prompts.js";
import { buildContentBrandGuidance } from "../dto/brand-kit-guidance.js";
import { CONTENT_PROVIDER_NAME } from "../dto/asset.mapper.js";
import { NotFoundError } from "../errors/auth.error.js";
import { logger } from "../lib/logger.js";

export class ContentService {
  constructor(
    private readonly repository = new ContentRepository(),
    private readonly projectRepository = new ProjectRepository(),
    private readonly brandKitRepository = new BrandKitRepository(),
    private readonly chatService = new ChatService(),
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

    let systemPrompt = CONTENT_SYSTEM_PROMPTS[data.type];

    if (data.brandKitId) {
      const brandKit = await this.brandKitRepository.findById(
        data.brandKitId,
        userId
      );

      if (!brandKit || brandKit.projectId !== data.projectId) {
        throw new NotFoundError("Brand kit not found.");
      }

      systemPrompt = `${systemPrompt}\n\n${buildContentBrandGuidance(brandKit)}`;
    }

    // Captured for Asset Details' "Generation Time" field (Sprint 5) — pure
    // timing around the existing call, no change to control flow or errors.
    const startedAt = Date.now();

    const result = await this.chatService.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: data.prompt },
    ]);

    const generationTimeMs = Date.now() - startedAt;

    const created = await this.repository.create({
      projectId: data.projectId,
      brandKitId: data.brandKitId ?? null,
      type: data.type,
      prompt: data.prompt,
      output: result.response,
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
        provider: CONTENT_PROVIDER_NAME,
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
