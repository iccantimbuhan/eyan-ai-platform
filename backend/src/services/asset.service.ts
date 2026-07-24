import type { GeneratedContent, GeneratedImage, SavedPrompt } from "../generated/prisma/client.js";
import type {
  AssetType,
  ContentType,
  ReviewStatus,
} from "../generated/prisma/enums.js";
import type {
  AssetDetailDto,
  AssetSummaryDto,
  AssetVersionDto,
  BatchAssetActionDto,
  BatchAssetActionResultDto,
  ListAssetsQueryDto,
  ReviewAssetDto,
} from "../dto/asset.dto.js";
import {
  CONTENT_PROVIDER_NAME,
  mapContentToDetail,
  mapContentToSummary,
  mapImageToDetail,
  mapImageToSummary,
  mapSavedPromptToDetail,
  mapSavedPromptToSummary,
} from "../dto/asset.mapper.js";

import { ContentRepository } from "../repositories/content.repository.js";
import { ImageRepository } from "../repositories/image.repository.js";
import { SavedPromptRepository } from "../repositories/saved-prompt.repository.js";
import {
  AssetReviewRepository,
  type AssetReviewUpsertData,
} from "../repositories/asset-review.repository.js";
import { AssetVersionRepository } from "../repositories/asset-version.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { ContentService } from "./content.service.js";
import { ImageService } from "./image.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { AssetActionNotSupportedError } from "../errors/asset.error.js";

// AssetType's first five values mirror ContentType exactly (see
// schema.prisma) — this is the one place that fact is relied on, to route
// a content-shaped AssetType to the content source without a mapping table.
const CONTENT_ASSET_TYPES: readonly AssetType[] = [
  "BLOG",
  "EMAIL",
  "SOCIAL_MEDIA",
  "MARKETING_COPY",
  "DOCUMENTATION",
];

function isContentAssetType(type: AssetType): boolean {
  return (CONTENT_ASSET_TYPES as readonly string[]).includes(type);
}

// Deliberate application-level scope boundary: list() fetches up to this
// many rows per source, merges, filters, sorts, and paginates in memory —
// fine at demo/portfolio data volumes (dozens-hundreds of assets per
// project), not intended to scale to a real production catalog without
// moving to a database-level UNION. See docs/ASSET_LIBRARY.md.
const FETCH_CAP = 500;

type ReviewRow = Awaited<ReturnType<AssetReviewRepository["findOne"]>>;
type ReviewListRow = Awaited<
  ReturnType<AssetReviewRepository["findManyBySourceIds"]>
>[number];
type VersionRow = Awaited<ReturnType<AssetVersionRepository["findOne"]>>;
type VersionListRow = Awaited<
  ReturnType<AssetVersionRepository["findManyBySourceIds"]>
>[number];

type SourceRef =
  | { kind: "content"; assetType: AssetType; projectId: string; row: GeneratedContent }
  | { kind: "image"; assetType: AssetType; projectId: string; row: GeneratedImage }
  | { kind: "prompt"; assetType: AssetType; projectId: string; row: SavedPrompt };

function reviewKey(assetType: AssetType, sourceId: string): string {
  return `${assetType}:${sourceId}`;
}

function toReviewMap(rows: ReviewListRow[]) {
  return new Map(rows.map((row) => [reviewKey(row.assetType, row.sourceId), row]));
}

function toVersionMap(rows: VersionListRow[]) {
  return new Map(rows.map((row) => [reviewKey(row.assetType, row.sourceId), row]));
}

// The Asset Library's business logic — the one real new service in Sprint
// 5. Composes the existing content/image/saved-prompt repositories and
// services rather than reimplementing generation, ownership checks, or
// persistence: this service's own job is exactly the aggregation, QA
// review, and versioning layer that sits on top of them. See
// docs/ASSET_LIBRARY.md for the full architecture rationale.
export class AssetService {
  constructor(
    private readonly contentRepository = new ContentRepository(),
    private readonly imageRepository = new ImageRepository(),
    private readonly savedPromptRepository = new SavedPromptRepository(),
    private readonly assetReviewRepository = new AssetReviewRepository(),
    private readonly assetVersionRepository = new AssetVersionRepository(),
    private readonly projectRepository = new ProjectRepository(),
    private readonly contentService = new ContentService(),
    private readonly imageService = new ImageService()
  ) {}

  async list(query: ListAssetsQueryDto, userId: string) {
    const project = await this.projectRepository.findById(query.projectId, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    const wantsContent = !query.type || isContentAssetType(query.type);
    const wantsImages = !query.type || query.type === "IMAGE";
    const wantsPrompts = !query.type || query.type === "PROMPT_TEMPLATE";

    const [contentRowsRaw, imageRows, promptRows] = await Promise.all([
      wantsContent
        ? this.contentRepository.findMany({
            projectId: query.projectId,
            userId,
            skip: 0,
            take: FETCH_CAP,
          })
        : Promise.resolve([]),
      wantsImages
        ? this.imageRepository.findMany({
            projectId: query.projectId,
            userId,
            skip: 0,
            take: FETCH_CAP,
          })
        : Promise.resolve([]),
      wantsPrompts
        ? this.savedPromptRepository.findManyByProject(query.projectId, userId)
        : Promise.resolve([]),
    ]);

    const contentRows = query.type
      ? contentRowsRaw.filter((row) => row.type === query.type)
      : contentRowsRaw;

    const pairs = [
      ...contentRows.map((row) => ({ assetType: row.type as AssetType, sourceId: row.id })),
      ...imageRows.map((row) => ({ assetType: "IMAGE" as AssetType, sourceId: row.id })),
      ...promptRows.map((row) => ({
        assetType: "PROMPT_TEMPLATE" as AssetType,
        sourceId: row.id,
      })),
    ];

    const [reviews, versions] = await Promise.all([
      this.assetReviewRepository.findManyBySourceIds(pairs),
      this.assetVersionRepository.findManyBySourceIds(pairs),
    ]);

    const reviewMap = toReviewMap(reviews);
    const versionMap = toVersionMap(versions);
    const projectRef = { id: project.id, name: project.name };

    let items: AssetSummaryDto[] = [
      ...contentRows.map((row) =>
        mapContentToSummary(
          row,
          projectRef,
          reviewMap.get(reviewKey(row.type, row.id)),
          versionMap.get(reviewKey(row.type, row.id))
        )
      ),
      ...imageRows.map((row) =>
        mapImageToSummary(
          row,
          projectRef,
          reviewMap.get(reviewKey("IMAGE", row.id)),
          versionMap.get(reviewKey("IMAGE", row.id))
        )
      ),
      ...promptRows.map((row) =>
        mapSavedPromptToSummary(
          row,
          projectRef,
          reviewMap.get(reviewKey("PROMPT_TEMPLATE", row.id)),
          versionMap.get(reviewKey("PROMPT_TEMPLATE", row.id))
        )
      ),
    ];

    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }
    if (query.provider) {
      items = items.filter((item) => item.provider === query.provider);
    }
    if (query.model) {
      items = items.filter((item) => item.model === query.model);
    }
    if (query.search) {
      const needle = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(needle) ||
          item.promptPreview.toLowerCase().includes(needle) ||
          (item.provider ?? "").toLowerCase().includes(needle) ||
          (item.model ?? "").toLowerCase().includes(needle) ||
          item.projectName.toLowerCase().includes(needle)
      );
    }

    const sortBy = query.sortBy ?? "createdAt";
    const direction = query.sortDir === "asc" ? 1 : -1;

    items = [...items].sort((a, b) =>
      sortBy === "title"
        ? a.title.localeCompare(b.title) * direction
        : (a[sortBy].getTime() - b[sortBy].getTime()) * direction
    );

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = items.length;
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getDetail(
    assetType: AssetType,
    sourceId: string,
    userId: string
  ): Promise<AssetDetailDto> {
    const source = await this.findSource(assetType, sourceId, userId);
    const projectRef = await this.requireProjectRef(source.projectId, userId);

    const [review, version] = await Promise.all([
      this.assetReviewRepository.findOne(assetType, sourceId),
      this.assetVersionRepository.findOne(assetType, sourceId),
    ]);

    return this.toDetailDto(source, projectRef, review ?? undefined, version ?? undefined);
  }

  async review(
    assetType: AssetType,
    sourceId: string,
    data: ReviewAssetDto,
    reviewerId: string,
    userId: string
  ): Promise<AssetDetailDto> {
    const source = await this.findSource(assetType, sourceId, userId);

    const upsertData: AssetReviewUpsertData = {
      notes: data.notes,
      qaScore: data.qaScore,
      checklist: data.checklist,
    };

    if (data.status !== undefined) {
      upsertData.status = data.status;
      upsertData.reviewerId = reviewerId;
      upsertData.reviewedAt = new Date();
    }

    await this.assetReviewRepository.upsert(
      assetType,
      sourceId,
      source.projectId,
      upsertData
    );

    return this.getDetail(assetType, sourceId, userId);
  }

  async regenerate(
    assetType: AssetType,
    sourceId: string,
    userId: string
  ): Promise<AssetDetailDto> {
    const source = await this.findSource(assetType, sourceId, userId);

    let newId: string;

    switch (source.kind) {
      case "image": {
        const created = await this.imageService.generate(
          {
            projectId: source.projectId,
            prompt: source.row.prompt,
            negativePrompt: source.row.negativePrompt ?? undefined,
            width: source.row.width,
            height: source.row.height,
            provider: source.row.provider,
          },
          userId
        );
        newId = created.id;
        break;
      }
      case "content": {
        // Safe: source.kind === "content" only ever happens when assetType
        // is one of CONTENT_ASSET_TYPES, which mirrors ContentType exactly
        // (see the constant's own comment) — TS can't see that link across
        // the two independently-typed parameters, so it's asserted here.
        const created = await this.contentService.generate(
          {
            projectId: source.projectId,
            type: assetType as ContentType,
            prompt: source.row.prompt,
          },
          userId
        );
        newId = created.id;
        break;
      }
      case "prompt":
        throw new AssetActionNotSupportedError(
          "Prompt templates cannot be regenerated."
        );
    }

    const previousVersion = await this.ensureVersion(
      assetType,
      sourceId,
      source.projectId
    );
    await this.assetVersionRepository.createNextVersion(
      assetType,
      newId,
      source.projectId,
      previousVersion
    );

    return this.getDetail(assetType, newId, userId);
  }

  async duplicate(
    assetType: AssetType,
    sourceId: string,
    userId: string
  ): Promise<AssetDetailDto> {
    const source = await this.findSource(assetType, sourceId, userId);

    let newId: string;

    switch (source.kind) {
      case "prompt": {
        const created = await this.savedPromptRepository.create({
          userId,
          projectId: source.projectId,
          name: `${source.row.name} (Copy)`,
          promptBody: source.row.promptBody,
          contentType: source.row.contentType,
        });
        newId = created.id;
        break;
      }
      case "content": {
        // A true, instant, free row copy — no provider call needed, and
        // nothing shared with the original that a later delete could
        // corrupt.
        const created = await this.contentRepository.create({
          projectId: source.projectId,
          type: source.row.type,
          prompt: source.row.prompt,
          output: source.row.output,
          model: source.row.model,
          createdBy: userId,
          generationTimeMs: source.row.generationTimeMs,
        });
        newId = created.id;
        break;
      }
      case "image": {
        // Unlike content, there's no file-copy primitive on StorageProvider,
        // and two DB rows sharing one stored file would make deleting
        // either one corrupt the other — so an image "Duplicate" generates
        // a fresh copy from the same prompt/provider instead of cloning the
        // stored file. Deliberately does not create a version link (a
        // duplicate is an independent asset, not a new version of this
        // one). See docs/ASSET_LIBRARY.md.
        const created = await this.imageService.generate(
          {
            projectId: source.projectId,
            prompt: source.row.prompt,
            negativePrompt: source.row.negativePrompt ?? undefined,
            width: source.row.width,
            height: source.row.height,
            provider: source.row.provider,
          },
          userId
        );
        newId = created.id;
        break;
      }
    }

    return this.getDetail(assetType, newId, userId);
  }

  async delete(assetType: AssetType, sourceId: string, userId: string): Promise<void> {
    const source = await this.findSource(assetType, sourceId, userId);

    switch (source.kind) {
      case "image":
        await this.imageService.delete(sourceId, userId);
        break;
      case "prompt":
        await this.savedPromptRepository.delete(sourceId);
        break;
      case "content":
        await this.contentService.delete(sourceId, userId);
        break;
    }

    await this.assetReviewRepository.deleteBySource(assetType, sourceId);
  }

  async listVersions(
    assetType: AssetType,
    sourceId: string,
    userId: string
  ): Promise<AssetVersionDto[]> {
    const source = await this.findSource(assetType, sourceId, userId);

    const version = await this.assetVersionRepository.findOne(assetType, sourceId);

    if (!version) {
      // No regeneration has ever happened for this asset — it's implicitly
      // version 1, dated to when the asset itself was created.
      return [
        {
          id: sourceId,
          sourceId,
          versionNumber: 1,
          createdAt: source.row.createdAt,
          provider: this.providerOf(source),
          model: this.modelOf(source),
        },
      ];
    }

    const lineage = await this.assetVersionRepository.findLineage(version.lineageId);

    // Each version in a lineage is a distinct source row (a separate
    // regeneration), so provider/model must be looked up per version —
    // lineages are always small (a handful of regenerations at most), so
    // one lookup per version is simple and fine at this scale.
    return Promise.all(
      lineage.map(async (row) => {
        const versionSource = await this.findSource(assetType, row.sourceId, userId);

        return {
          id: row.id,
          sourceId: row.sourceId,
          versionNumber: row.versionNumber,
          createdAt: row.createdAt,
          provider: this.providerOf(versionSource),
          model: this.modelOf(versionSource),
        };
      })
    );
  }

  private providerOf(source: SourceRef): string | null {
    switch (source.kind) {
      case "image":
        return source.row.provider;
      case "content":
        return CONTENT_PROVIDER_NAME;
      case "prompt":
        return null;
    }
  }

  private modelOf(source: SourceRef): string | null {
    switch (source.kind) {
      case "image":
        return source.row.model;
      case "content":
        return source.row.model;
      case "prompt":
        return null;
    }
  }

  async batch(
    data: BatchAssetActionDto,
    userId: string
  ): Promise<BatchAssetActionResultDto[]> {
    const results: BatchAssetActionResultDto[] = [];

    for (const item of data.items) {
      try {
        if (data.action === "delete") {
          await this.delete(item.assetType, item.sourceId, userId);
        } else {
          const status: ReviewStatus =
            data.action === "approve" ? "APPROVED" : "REJECTED";
          await this.review(item.assetType, item.sourceId, { status }, userId, userId);
        }

        results.push({ sourceId: item.sourceId, assetType: item.assetType, success: true });
      } catch (error) {
        results.push({
          sourceId: item.sourceId,
          assetType: item.assetType,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  private async findSource(
    assetType: AssetType,
    sourceId: string,
    userId: string
  ): Promise<SourceRef> {
    if (assetType === "IMAGE") {
      const row = await this.imageRepository.findById(sourceId, userId);

      if (!row) {
        throw new NotFoundError("Asset not found.");
      }

      return { kind: "image", assetType, projectId: row.projectId, row };
    }

    if (assetType === "PROMPT_TEMPLATE") {
      const row = await this.savedPromptRepository.findById(sourceId, userId);

      // A global (non-project-scoped) prompt isn't a project asset — only
      // ever reachable through the standalone Prompt Library, not here.
      if (!row || !row.projectId) {
        throw new NotFoundError("Asset not found.");
      }

      return { kind: "prompt", assetType, projectId: row.projectId, row };
    }

    const row = await this.contentRepository.findById(sourceId, userId);

    if (!row || row.type !== assetType) {
      throw new NotFoundError("Asset not found.");
    }

    return { kind: "content", assetType, projectId: row.projectId, row };
  }

  private async requireProjectRef(
    projectId: string,
    userId: string
  ): Promise<{ id: string; name: string }> {
    const project = await this.projectRepository.findById(projectId, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    return { id: project.id, name: project.name };
  }

  private async ensureVersion(
    assetType: AssetType,
    sourceId: string,
    projectId: string
  ) {
    const existing = await this.assetVersionRepository.findOne(assetType, sourceId);

    if (existing) {
      return existing;
    }

    return this.assetVersionRepository.createFirstVersion(assetType, sourceId, projectId);
  }

  private toDetailDto(
    source: SourceRef,
    projectRef: { id: string; name: string },
    review: NonNullable<ReviewRow> | undefined,
    version: NonNullable<VersionRow> | undefined
  ): AssetDetailDto {
    switch (source.kind) {
      case "image":
        return mapImageToDetail(source.row, projectRef, review, version ?? undefined);
      case "prompt":
        return mapSavedPromptToDetail(source.row, projectRef, review, version ?? undefined);
      case "content":
        return mapContentToDetail(source.row, projectRef, review, version ?? undefined);
    }
  }
}

export const assetService = new AssetService();
