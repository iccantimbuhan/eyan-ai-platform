import type {
  AssetComment,
  AssetReviewAssignment,
  BrandKit,
  GeneratedContent,
  GeneratedImage,
  SavedPrompt,
  VideoAsset,
} from "../generated/prisma/client.js";
import type {
  AssetType,
  ContentType,
  PublishingStatus,
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
import type {
  AssetAssignmentDto,
  AssetCommentDto,
  AssetReviewEventDto,
  AssignReviewerDto,
  CreateAssetCommentDto,
} from "../dto/review-workspace.dto.js";
import type {
  PublishingRecordDto,
  SchedulePublishDto,
} from "../dto/publishing.dto.js";
import type { CreateBrandKitDto } from "../dto/brand-kit.dto.js";
import {
  CONTENT_PROVIDER_NAME,
  mapBrandKitToDetail,
  mapBrandKitToSummary,
  mapContentToDetail,
  mapContentToSummary,
  mapImageToDetail,
  mapImageToSummary,
  mapSavedPromptToDetail,
  mapSavedPromptToSummary,
  mapVideoAssetToDetail,
  mapVideoAssetToSummary,
  type AssigneeRef,
  type CommentStats,
  type PublishingSummary,
} from "../dto/asset.mapper.js";

import { ContentRepository } from "../repositories/content.repository.js";
import { ImageRepository } from "../repositories/image.repository.js";
import { SavedPromptRepository } from "../repositories/saved-prompt.repository.js";
import { BrandKitRepository } from "../repositories/brand-kit.repository.js";
import { VideoAssetRepository } from "../repositories/video-asset.repository.js";
import {
  AssetReviewRepository,
  type AssetReviewUpsertData,
} from "../repositories/asset-review.repository.js";
import { AssetVersionRepository } from "../repositories/asset-version.repository.js";
import { AssetCommentRepository } from "../repositories/asset-comment.repository.js";
import { AssetReviewAssignmentRepository } from "../repositories/asset-review-assignment.repository.js";
import { AssetReviewEventRepository } from "../repositories/asset-review-event.repository.js";
import {
  PublishingRecordRepository,
  type PublishingRecordRow,
} from "../repositories/publishing-record.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { ContentService } from "./content.service.js";
import { ImageService } from "./image.service.js";
import { VideoAssetService } from "./video-asset.service.js";
import { isTextVideoKind } from "../config/video-prompts.js";
import { NotFoundError } from "../errors/auth.error.js";
import { AssetActionNotSupportedError } from "../errors/asset.error.js";
import { PlatformProviderFactory } from "../providers/platform-provider.factory.js";
import type { PlatformProvider } from "../providers/interfaces/platform-provider.js";
import {
  AssetNotApprovedError,
  PublishingFailedError,
  PublishingRecordNotFoundError,
  PublishingRetryNotAllowedError,
} from "../errors/publishing.error.js";

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
type CommentListRow = Awaited<
  ReturnType<AssetCommentRepository["findManyBySourceIds"]>
>[number];
type AssignmentListRow = Awaited<
  ReturnType<AssetReviewAssignmentRepository["findManyBySourceIds"]>
>[number];
type PublishingListRow = Awaited<
  ReturnType<PublishingRecordRepository["findManyBySourceIds"]>
>[number];

// Mirrors ImageService's imageProviderFactory injection point — a factory
// *reference*, not a resolved instance, so a test can substitute a fake
// registry without touching the real one. See ADR-0010.
interface PlatformProviderResolver {
  create(providerName: string): PlatformProvider;
}

type SourceRef =
  | { kind: "content"; assetType: AssetType; projectId: string; row: GeneratedContent }
  | { kind: "image"; assetType: AssetType; projectId: string; row: GeneratedImage }
  | { kind: "prompt"; assetType: AssetType; projectId: string; row: SavedPrompt }
  | { kind: "brandKit"; assetType: AssetType; projectId: string; row: BrandKit }
  | { kind: "video"; assetType: AssetType; projectId: string; row: VideoAsset };

function reviewKey(assetType: AssetType, sourceId: string): string {
  return `${assetType}:${sourceId}`;
}

function toReviewMap(rows: ReviewListRow[]) {
  return new Map(rows.map((row) => [reviewKey(row.assetType, row.sourceId), row]));
}

function toVersionMap(rows: VersionListRow[]) {
  return new Map(rows.map((row) => [reviewKey(row.assetType, row.sourceId), row]));
}

// Aggregated in-memory from the batch-fetched comment rows, matching this
// service's existing "aggregation happens in the service layer, not the
// database" posture (ADR-0008) rather than a second DB round trip.
function toCommentStatsMap(rows: CommentListRow[]) {
  const map = new Map<string, CommentStats>();

  for (const row of rows) {
    const key = reviewKey(row.assetType, row.sourceId);
    const existing = map.get(key) ?? { total: 0, open: 0 };
    existing.total += 1;
    if (!row.resolvedAt) {
      existing.open += 1;
    }
    map.set(key, existing);
  }

  return map;
}

function toAssigneeMap(rows: AssignmentListRow[]) {
  return new Map<string, AssigneeRef>(
    rows.map((row) => [
      reviewKey(row.assetType, row.sourceId),
      { id: row.assignee.id, name: row.assignee.name },
    ])
  );
}

// One asset can have multiple PublishingRecords (one per platform), unlike
// review/assignment which are one-per-asset — grouped into an array per
// key rather than a single value. See ADR-0010.
function toPublishingMap(rows: PublishingListRow[]) {
  const map = new Map<string, PublishingSummary[]>();

  for (const row of rows) {
    const key = reviewKey(row.assetType, row.sourceId);
    const existing = map.get(key) ?? [];
    existing.push({ platform: row.platform, status: row.status });
    map.set(key, existing);
  }

  return map;
}

function mapPublishingRecordToDto(row: PublishingRecordRow): PublishingRecordDto {
  return {
    id: row.id,
    assetType: row.assetType,
    sourceId: row.sourceId,
    platform: row.platform,
    status: row.status,
    scheduledFor: row.scheduledFor,
    publishedAt: row.publishedAt,
    externalId: row.externalId,
    externalUrl: row.externalUrl,
    errorMessage: row.errorMessage,
    attempts: row.attempts,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCommentToDto(row: AssetComment, authorName: string): AssetCommentDto {
  const hasRegion =
    row.regionX !== null &&
    row.regionY !== null &&
    row.regionWidth !== null &&
    row.regionHeight !== null;

  return {
    id: row.id,
    assetType: row.assetType,
    sourceId: row.sourceId,
    authorId: row.authorId,
    authorName,
    body: row.body,
    isInternal: row.isInternal,
    region: hasRegion
      ? {
          x: row.regionX as number,
          y: row.regionY as number,
          width: row.regionWidth as number,
          height: row.regionHeight as number,
        }
      : null,
    timestampMs: row.timestampMs,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAssignmentToDto(
  row: AssetReviewAssignment,
  assigneeName: string,
  assignedByName: string
): AssetAssignmentDto {
  return {
    id: row.id,
    assetType: row.assetType,
    sourceId: row.sourceId,
    assigneeId: row.assigneeId,
    assigneeName,
    assignedById: row.assignedById,
    assignedByName,
    note: row.note,
    createdAt: row.createdAt,
  };
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
    private readonly brandKitRepository = new BrandKitRepository(),
    private readonly videoAssetRepository = new VideoAssetRepository(),
    private readonly assetReviewRepository = new AssetReviewRepository(),
    private readonly assetVersionRepository = new AssetVersionRepository(),
    private readonly projectRepository = new ProjectRepository(),
    private readonly contentService = new ContentService(),
    private readonly imageService = new ImageService(),
    private readonly videoAssetService = new VideoAssetService(),
    private readonly assetCommentRepository = new AssetCommentRepository(),
    private readonly assetReviewAssignmentRepository = new AssetReviewAssignmentRepository(),
    private readonly assetReviewEventRepository = new AssetReviewEventRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly publishingRecordRepository = new PublishingRecordRepository(),
    private readonly platformProviderFactory: PlatformProviderResolver = PlatformProviderFactory
  ) {}

  async list(query: ListAssetsQueryDto, userId: string) {
    const project = await this.projectRepository.findById(query.projectId, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    const wantsContent = !query.type || isContentAssetType(query.type);
    const wantsImages = !query.type || query.type === "IMAGE";
    const wantsPrompts = !query.type || query.type === "PROMPT_TEMPLATE";
    const wantsBrandKits = !query.type || query.type === "BRAND_KIT";
    const wantsVideos = !query.type || query.type === "VIDEO";

    const [contentRowsRaw, imageRows, promptRows, brandKitRows, videoRows] = await Promise.all([
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
      wantsBrandKits
        ? this.brandKitRepository.findManyByProject(query.projectId, userId)
        : Promise.resolve([]),
      wantsVideos
        ? this.videoAssetRepository.findMany({
            projectId: query.projectId,
            userId,
            skip: 0,
            take: FETCH_CAP,
          })
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
      ...brandKitRows.map((row) => ({
        assetType: "BRAND_KIT" as AssetType,
        sourceId: row.id,
      })),
      ...videoRows.map((row) => ({
        assetType: "VIDEO" as AssetType,
        sourceId: row.id,
      })),
    ];

    const [reviews, versions, comments, assignments, publishingRecords] = await Promise.all([
      this.assetReviewRepository.findManyBySourceIds(pairs),
      this.assetVersionRepository.findManyBySourceIds(pairs),
      this.assetCommentRepository.findManyBySourceIds(pairs),
      this.assetReviewAssignmentRepository.findManyBySourceIds(pairs),
      this.publishingRecordRepository.findManyBySourceIds(pairs),
    ]);

    const reviewMap = toReviewMap(reviews);
    const versionMap = toVersionMap(versions);
    const commentStatsMap = toCommentStatsMap(comments);
    const assigneeMap = toAssigneeMap(assignments);
    const publishingMap = toPublishingMap(publishingRecords);
    const projectRef = { id: project.id, name: project.name };

    let items: AssetSummaryDto[] = [
      ...contentRows.map((row) =>
        mapContentToSummary(
          row,
          projectRef,
          reviewMap.get(reviewKey(row.type, row.id)),
          versionMap.get(reviewKey(row.type, row.id)),
          commentStatsMap.get(reviewKey(row.type, row.id)),
          assigneeMap.get(reviewKey(row.type, row.id)),
          publishingMap.get(reviewKey(row.type, row.id))
        )
      ),
      ...imageRows.map((row) =>
        mapImageToSummary(
          row,
          projectRef,
          reviewMap.get(reviewKey("IMAGE", row.id)),
          versionMap.get(reviewKey("IMAGE", row.id)),
          commentStatsMap.get(reviewKey("IMAGE", row.id)),
          assigneeMap.get(reviewKey("IMAGE", row.id)),
          publishingMap.get(reviewKey("IMAGE", row.id))
        )
      ),
      ...promptRows.map((row) =>
        mapSavedPromptToSummary(
          row,
          projectRef,
          reviewMap.get(reviewKey("PROMPT_TEMPLATE", row.id)),
          versionMap.get(reviewKey("PROMPT_TEMPLATE", row.id)),
          commentStatsMap.get(reviewKey("PROMPT_TEMPLATE", row.id)),
          assigneeMap.get(reviewKey("PROMPT_TEMPLATE", row.id)),
          publishingMap.get(reviewKey("PROMPT_TEMPLATE", row.id))
        )
      ),
      ...brandKitRows.map((row) =>
        mapBrandKitToSummary(
          row,
          projectRef,
          reviewMap.get(reviewKey("BRAND_KIT", row.id)),
          versionMap.get(reviewKey("BRAND_KIT", row.id)),
          commentStatsMap.get(reviewKey("BRAND_KIT", row.id)),
          assigneeMap.get(reviewKey("BRAND_KIT", row.id)),
          publishingMap.get(reviewKey("BRAND_KIT", row.id))
        )
      ),
      ...videoRows.map((row) =>
        mapVideoAssetToSummary(
          row,
          projectRef,
          reviewMap.get(reviewKey("VIDEO", row.id)),
          versionMap.get(reviewKey("VIDEO", row.id)),
          commentStatsMap.get(reviewKey("VIDEO", row.id)),
          assigneeMap.get(reviewKey("VIDEO", row.id)),
          publishingMap.get(reviewKey("VIDEO", row.id))
        )
      ),
    ];

    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }
    if (query.publishingStatus) {
      items = items.filter((item) =>
        item.publishing.some((record) => record.status === query.publishingStatus)
      );
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

    const [review, version, comments, assignment, publishingRecords] = await Promise.all([
      this.assetReviewRepository.findOne(assetType, sourceId),
      this.assetVersionRepository.findOne(assetType, sourceId),
      this.assetCommentRepository.findManyBySource(assetType, sourceId),
      this.assetReviewAssignmentRepository.findOne(assetType, sourceId),
      this.publishingRecordRepository.findManyBySource(assetType, sourceId),
    ]);

    const commentStats: CommentStats = {
      total: comments.length,
      open: comments.filter((comment) => !comment.resolvedAt).length,
    };
    const assignee: AssigneeRef | undefined = assignment
      ? { id: assignment.assignee.id, name: assignment.assignee.name }
      : undefined;
    const publishing: PublishingSummary[] = publishingRecords.map((record) => ({
      platform: record.platform,
      status: record.status,
    }));

    return this.toDetailDto(
      source,
      projectRef,
      review ?? undefined,
      version ?? undefined,
      commentStats,
      assignee,
      publishing
    );
  }

  async review(
    assetType: AssetType,
    sourceId: string,
    data: ReviewAssetDto,
    reviewerId: string,
    userId: string
  ): Promise<AssetDetailDto> {
    const source = await this.findSource(assetType, sourceId, userId);

    // Read before write, same shape findSource() already uses — needed to
    // capture fromStatus for the STATUS_CHANGED timeline event below.
    const existingReview = await this.assetReviewRepository.findOne(assetType, sourceId);
    const fromStatus = existingReview?.status ?? "DRAFT";

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

    if (data.status !== undefined && data.status !== fromStatus) {
      await this.assetReviewEventRepository.create({
        projectId: source.projectId,
        assetType,
        sourceId,
        type: "STATUS_CHANGED",
        actorId: reviewerId,
        fromStatus,
        toStatus: data.status,
      });
    }

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
      case "brandKit":
        throw new AssetActionNotSupportedError(
          "Brand kits cannot be regenerated."
        );
      case "video": {
        // Unlike BRAND_KIT/PROMPT_TEMPLATE, a VideoAsset is provider/AI
        // generated (both text and image kinds) — regeneration is
        // supported, reusing the same stored prompt/kind/videoGroupId/
        // brandKitId (plus provider, for image kinds; ignored for text
        // kinds by VideoAssetService).
        const created = await this.videoAssetService.generate(
          {
            projectId: source.projectId,
            kind: source.row.kind,
            prompt: source.row.prompt,
            videoGroupId: source.row.videoGroupId,
            brandKitId: source.row.brandKitId ?? undefined,
            provider: source.row.provider ?? undefined,
            width: source.row.width ?? undefined,
            height: source.row.height ?? undefined,
          },
          userId
        );
        newId = created.id;
        break;
      }
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

    await this.assetReviewEventRepository.create({
      projectId: source.projectId,
      assetType,
      sourceId: newId,
      type: "VERSION_CREATED",
      actorId: userId,
      metadata: { previousSourceId: sourceId },
    });

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
      case "brandKit": {
        // A true, instant row copy — like content, there's nothing
        // provider-generated to re-run. Json columns round-trip through
        // `unknown` since Prisma's JsonValue type doesn't structurally
        // match the DTO's array shapes.
        const created = await this.brandKitRepository.create({
          projectId: source.projectId,
          createdBy: userId,
          name: `${source.row.name} (Copy)`,
          client: source.row.client ?? undefined,
          logos: (source.row.logos as unknown as CreateBrandKitDto["logos"]) ?? undefined,
          primaryColors:
            (source.row.primaryColors as unknown as CreateBrandKitDto["primaryColors"]) ??
            undefined,
          secondaryColors:
            (source.row.secondaryColors as unknown as CreateBrandKitDto["secondaryColors"]) ??
            undefined,
          fonts: (source.row.fonts as unknown as CreateBrandKitDto["fonts"]) ?? undefined,
          typography: source.row.typography ?? undefined,
          toneOfVoice: source.row.toneOfVoice ?? undefined,
          writingStyle: source.row.writingStyle ?? undefined,
          audience: source.row.audience ?? undefined,
          ctaStyle: source.row.ctaStyle ?? undefined,
          approvedTerminology: source.row.approvedTerminology,
          restrictedWords: source.row.restrictedWords,
          brandGuidelines: source.row.brandGuidelines ?? undefined,
          imageStyle: source.row.imageStyle ?? undefined,
          socialMediaGuidelines: source.row.socialMediaGuidelines ?? undefined,
        });
        newId = created.id;
        break;
      }
      case "video": {
        if (isTextVideoKind(source.row.kind)) {
          // A true, instant row copy — like content, there's nothing
          // provider-generated to re-run for a text kind.
          const created = await this.videoAssetRepository.create({
            projectId: source.projectId,
            brandKitId: source.row.brandKitId,
            videoGroupId: source.row.videoGroupId,
            kind: source.row.kind,
            prompt: source.row.prompt,
            output: source.row.output,
            model: source.row.model,
            status: "COMPLETED",
            generationTimeMs: source.row.generationTimeMs,
            createdBy: userId,
          });
          newId = created.id;
        } else {
          // Same reasoning as GeneratedImage's own duplicate case: no
          // file-copy primitive exists on StorageProvider, so an image-kind
          // video asset "Duplicate" re-generates from the same
          // prompt/provider instead of cloning the stored file.
          const created = await this.videoAssetService.generate(
            {
              projectId: source.projectId,
              kind: source.row.kind,
              prompt: source.row.prompt,
              videoGroupId: source.row.videoGroupId,
              brandKitId: source.row.brandKitId ?? undefined,
              provider: source.row.provider ?? undefined,
              width: source.row.width ?? undefined,
              height: source.row.height ?? undefined,
            },
            userId
          );
          newId = created.id;
        }
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
      case "brandKit":
        await this.brandKitRepository.delete(sourceId);
        break;
      case "video":
        await this.videoAssetService.delete(sourceId, userId);
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

  // --- Sprint 6.3 (Creative Review Workspace) -----------------------------
  // Comments/annotations, informational-only assignment, and the append-
  // only activity timeline. All reuse findSource()'s ownership check
  // directly — no parallel review system. See ADR-0009.

  async addComment(
    assetType: AssetType,
    sourceId: string,
    data: CreateAssetCommentDto,
    authorId: string,
    userId: string
  ): Promise<AssetCommentDto> {
    const source = await this.findSource(assetType, sourceId, userId);

    const isAnnotation = data.region !== undefined || data.timestampMs !== undefined;

    const created = await this.assetCommentRepository.create({
      projectId: source.projectId,
      assetType,
      sourceId,
      authorId,
      body: data.body,
      isInternal: data.isInternal ?? false,
      regionX: data.region?.x,
      regionY: data.region?.y,
      regionWidth: data.region?.width,
      regionHeight: data.region?.height,
      timestampMs: data.timestampMs,
    });

    await this.assetReviewEventRepository.create({
      projectId: source.projectId,
      assetType,
      sourceId,
      type: isAnnotation ? "ANNOTATION_ADDED" : "COMMENT_ADDED",
      actorId: authorId,
    });

    const author = await this.userRepository.findById(authorId);

    return mapCommentToDto(created, author?.name ?? "");
  }

  async listComments(
    assetType: AssetType,
    sourceId: string,
    userId: string
  ): Promise<AssetCommentDto[]> {
    await this.findSource(assetType, sourceId, userId);

    const comments = await this.assetCommentRepository.findManyBySource(assetType, sourceId);
    const authorIds = [...new Set(comments.map((comment) => comment.authorId))];
    const authors = await Promise.all(
      authorIds.map((id) => this.userRepository.findById(id))
    );
    const authorNames = new Map(
      authors.filter((a): a is NonNullable<typeof a> => a !== null).map((a) => [a.id, a.name])
    );

    return comments.map((comment) =>
      mapCommentToDto(comment, authorNames.get(comment.authorId) ?? "")
    );
  }

  async resolveComment(
    assetType: AssetType,
    sourceId: string,
    commentId: string,
    userId: string
  ): Promise<AssetCommentDto> {
    const source = await this.findSource(assetType, sourceId, userId);

    const existing = await this.assetCommentRepository.findById(commentId);
    if (!existing || existing.assetType !== assetType || existing.sourceId !== sourceId) {
      throw new NotFoundError("Comment not found.");
    }

    const resolved = await this.assetCommentRepository.resolve(commentId, userId);

    await this.assetReviewEventRepository.create({
      projectId: source.projectId,
      assetType,
      sourceId,
      type: "COMMENT_RESOLVED",
      actorId: userId,
    });

    const author = await this.userRepository.findById(resolved.authorId);

    return mapCommentToDto(resolved, author?.name ?? "");
  }

  async deleteComment(
    assetType: AssetType,
    sourceId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    await this.findSource(assetType, sourceId, userId);

    const existing = await this.assetCommentRepository.findById(commentId);
    if (!existing || existing.assetType !== assetType || existing.sourceId !== sourceId) {
      throw new NotFoundError("Comment not found.");
    }

    await this.assetCommentRepository.delete(commentId);
  }

  async assignReviewer(
    assetType: AssetType,
    sourceId: string,
    data: AssignReviewerDto,
    assignedById: string,
    userId: string
  ): Promise<AssetAssignmentDto> {
    const source = await this.findSource(assetType, sourceId, userId);

    const assignee = await this.userRepository.findById(data.assigneeId);
    if (!assignee) {
      throw new NotFoundError("Assignee not found.");
    }

    await this.assetReviewAssignmentRepository.upsert(assetType, sourceId, source.projectId, {
      assigneeId: data.assigneeId,
      assignedById,
      note: data.note,
    });

    await this.assetReviewEventRepository.create({
      projectId: source.projectId,
      assetType,
      sourceId,
      type: "ASSIGNED",
      actorId: assignedById,
      metadata: { assigneeId: data.assigneeId },
    });

    const assignment = await this.assetReviewAssignmentRepository.findOne(assetType, sourceId);
    if (!assignment) {
      throw new NotFoundError("Assignment not found.");
    }

    const assignedBy = await this.userRepository.findById(assignment.assignedById);

    return mapAssignmentToDto(assignment, assignment.assignee.name, assignedBy?.name ?? "");
  }

  async unassignReviewer(
    assetType: AssetType,
    sourceId: string,
    userId: string
  ): Promise<void> {
    const source = await this.findSource(assetType, sourceId, userId);

    await this.assetReviewAssignmentRepository.delete(assetType, sourceId);

    await this.assetReviewEventRepository.create({
      projectId: source.projectId,
      assetType,
      sourceId,
      type: "UNASSIGNED",
      actorId: userId,
    });
  }

  async getTimeline(
    assetType: AssetType,
    sourceId: string,
    userId: string
  ): Promise<AssetReviewEventDto[]> {
    await this.findSource(assetType, sourceId, userId);

    const events = await this.assetReviewEventRepository.findManyBySource(assetType, sourceId);

    return events.map((event) => ({
      id: event.id,
      type: event.type,
      actorId: event.actorId,
      actorName: event.actor.name,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      metadata: (event.metadata as Record<string, unknown> | null) ?? null,
      createdAt: event.createdAt,
    }));
  }

  // --- Sprint 6.4 (Publishing Pipeline) -----------------------------------
  // Independent of QA review (ReviewStatus stays untouched) — gated on the
  // asset's current QA status being APPROVED, and connected to the review
  // system only via the shared (assetType, sourceId) key and the
  // AssetReviewEvent timeline (no second timeline). See ADR-0010.

  async listPublishingRecords(
    assetType: AssetType,
    sourceId: string,
    userId: string
  ): Promise<PublishingRecordDto[]> {
    await this.findSource(assetType, sourceId, userId);

    const records = await this.publishingRecordRepository.findManyBySource(
      assetType,
      sourceId
    );

    return records.map(mapPublishingRecordToDto);
  }

  async schedulePublish(
    assetType: AssetType,
    sourceId: string,
    data: SchedulePublishDto,
    userId: string
  ): Promise<PublishingRecordDto> {
    const source = await this.findSource(assetType, sourceId, userId);

    await this.requireApproved(assetType, sourceId);

    const scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : null;
    const status: PublishingStatus = scheduledFor ? "SCHEDULED" : "DRAFT";

    const record = await this.publishingRecordRepository.upsert(
      assetType,
      sourceId,
      source.projectId,
      data.platform,
      { createdById: userId, status, scheduledFor }
    );

    if (scheduledFor) {
      await this.assetReviewEventRepository.create({
        projectId: source.projectId,
        assetType,
        sourceId,
        type: "PUBLISH_SCHEDULED",
        actorId: userId,
        metadata: { platform: data.platform, scheduledFor: scheduledFor.toISOString() },
      });
    }

    return mapPublishingRecordToDto(record);
  }

  // The single, stable entry point a future background executor can call
  // unchanged — this sprint only calls it from the immediate "Publish Now"
  // user action and from retryPublish(); no scheduler exists yet to call it
  // automatically for due SCHEDULED records. See ADR-0010.
  async publish(
    assetType: AssetType,
    sourceId: string,
    platform: string,
    userId: string
  ): Promise<PublishingRecordDto> {
    const source = await this.findSource(assetType, sourceId, userId);

    await this.requireApproved(assetType, sourceId);

    const existing = await this.publishingRecordRepository.findOne(
      assetType,
      sourceId,
      platform
    );

    const record =
      existing ??
      (await this.publishingRecordRepository.upsert(
        assetType,
        sourceId,
        source.projectId,
        platform,
        { createdById: userId, status: "DRAFT" }
      ));

    await this.publishingRecordRepository.update(record.id, { status: "PUBLISHING" });

    await this.assetReviewEventRepository.create({
      projectId: source.projectId,
      assetType,
      sourceId,
      type: "PUBLISH_STARTED",
      actorId: userId,
      metadata: { platform },
    });

    const detail = await this.getDetail(assetType, sourceId, userId);

    try {
      const provider = this.platformProviderFactory.create(platform);
      const result = await provider.publish({
        projectId: source.projectId,
        assetType,
        sourceId,
        title: detail.title,
        body: detail.output ?? detail.prompt,
      });

      const published = await this.publishingRecordRepository.update(record.id, {
        status: "PUBLISHED",
        publishedAt: new Date(),
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        errorMessage: null,
      });

      await this.assetReviewEventRepository.create({
        projectId: source.projectId,
        assetType,
        sourceId,
        type: "PUBLISHED",
        actorId: userId,
        metadata: { platform, externalUrl: result.externalUrl },
      });

      return mapPublishingRecordToDto(published);
    } catch (error) {
      // Same stage-based persist-then-throw convention as
      // ImageService.generate(): the failure is durably recorded (status,
      // sanitized message, incremented attempts) before a generic error
      // goes back to the caller — the raw provider error never reaches the
      // HTTP response.
      const message = error instanceof Error ? error.message : "Unknown error";

      await this.publishingRecordRepository.update(record.id, {
        status: "FAILED",
        errorMessage: message,
        attempts: record.attempts + 1,
      });

      await this.assetReviewEventRepository.create({
        projectId: source.projectId,
        assetType,
        sourceId,
        type: "PUBLISH_FAILED",
        actorId: userId,
        metadata: { platform, error: message },
      });

      throw new PublishingFailedError(
        "Publishing failed. Please try again, or try a different platform."
      );
    }
  }

  async retryPublish(
    assetType: AssetType,
    sourceId: string,
    platform: string,
    userId: string
  ): Promise<PublishingRecordDto> {
    await this.findSource(assetType, sourceId, userId);

    const existing = await this.publishingRecordRepository.findOne(
      assetType,
      sourceId,
      platform
    );

    if (!existing) {
      throw new PublishingRecordNotFoundError();
    }
    if (existing.status !== "FAILED") {
      throw new PublishingRetryNotAllowedError();
    }

    return this.publish(assetType, sourceId, platform, userId);
  }

  async archivePublish(
    assetType: AssetType,
    sourceId: string,
    platform: string,
    userId: string
  ): Promise<PublishingRecordDto> {
    await this.findSource(assetType, sourceId, userId);

    const existing = await this.publishingRecordRepository.findOne(
      assetType,
      sourceId,
      platform
    );

    if (!existing) {
      throw new PublishingRecordNotFoundError();
    }

    // Bookkeeping only — no real "unpublish" call to the provider, and
    // deliberately no new timeline event (archiving isn't a QA- or
    // publish-relevant transition worth growing ReviewEventType for). See
    // ADR-0010.
    const archived = await this.publishingRecordRepository.update(existing.id, {
      status: "ARCHIVED",
    });

    return mapPublishingRecordToDto(archived);
  }

  private providerOf(source: SourceRef): string | null {
    switch (source.kind) {
      case "image":
        return source.row.provider;
      case "content":
        return CONTENT_PROVIDER_NAME;
      case "prompt":
        return null;
      case "brandKit":
        return null;
      case "video":
        // Text kinds have no provider column of their own (see
        // VideoAssetService — same single-provider reasoning as
        // CONTENT_PROVIDER_NAME); image kinds populate it exactly like
        // GeneratedImage.
        return source.row.provider ?? (isTextVideoKind(source.row.kind) ? CONTENT_PROVIDER_NAME : null);
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
      case "brandKit":
        return null;
      case "video":
        return source.row.model;
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

    if (assetType === "BRAND_KIT") {
      const row = await this.brandKitRepository.findById(sourceId, userId);

      if (!row) {
        throw new NotFoundError("Asset not found.");
      }

      return { kind: "brandKit", assetType, projectId: row.projectId, row };
    }

    if (assetType === "VIDEO") {
      const row = await this.videoAssetRepository.findById(sourceId, userId);

      if (!row) {
        throw new NotFoundError("Asset not found.");
      }

      return { kind: "video", assetType, projectId: row.projectId, row };
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

  private async requireApproved(assetType: AssetType, sourceId: string): Promise<void> {
    const review = await this.assetReviewRepository.findOne(assetType, sourceId);

    if (!review || review.status !== "APPROVED") {
      throw new AssetNotApprovedError();
    }
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
    version: NonNullable<VersionRow> | undefined,
    commentStats?: CommentStats,
    assignee?: AssigneeRef,
    publishing?: PublishingSummary[]
  ): AssetDetailDto {
    switch (source.kind) {
      case "image":
        return mapImageToDetail(source.row, projectRef, review, version ?? undefined, commentStats, assignee, publishing);
      case "prompt":
        return mapSavedPromptToDetail(source.row, projectRef, review, version ?? undefined, commentStats, assignee, publishing);
      case "content":
        return mapContentToDetail(source.row, projectRef, review, version ?? undefined, commentStats, assignee, publishing);
      case "brandKit":
        return mapBrandKitToDetail(source.row, projectRef, review, version ?? undefined, commentStats, assignee, publishing);
      case "video":
        return mapVideoAssetToDetail(source.row, projectRef, review, version ?? undefined, commentStats, assignee, publishing);
    }
  }
}

export const assetService = new AssetService();
