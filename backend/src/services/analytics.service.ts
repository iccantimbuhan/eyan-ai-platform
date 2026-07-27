import type { AssetType } from "../generated/prisma/enums.js";
import type {
  ActivityFeedItemDto,
  ActivityFeedResultDto,
  AssetTypeCountDto,
  BrandKitUsageDto,
  GetActivityQueryDto,
  PerformanceMetricDto,
  ProjectAnalyticsSummaryDto,
  ProviderUsageDto,
  PublishingStatusCountDto,
  ReviewStatusCountDto,
} from "../dto/analytics.dto.js";

import { ContentRepository } from "../repositories/content.repository.js";
import { ImageRepository } from "../repositories/image.repository.js";
import { VideoAssetRepository } from "../repositories/video-asset.repository.js";
import { BrandKitRepository } from "../repositories/brand-kit.repository.js";
import { SavedPromptRepository } from "../repositories/saved-prompt.repository.js";
import { AssetReviewRepository } from "../repositories/asset-review.repository.js";
import { PublishingRecordRepository } from "../repositories/publishing-record.repository.js";
import { AssetReviewEventRepository } from "../repositories/asset-review-event.repository.js";
import { AnalyticsEventRepository } from "../repositories/analytics-event.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { NotFoundError } from "../errors/auth.error.js";

// Same deliberate scope boundary AssetService.list() already documents
// (ADR-0008): fine at demo/portfolio data volumes, not a database-level
// rollup. Analytics aggregates in the service layer for the same reason.
const FETCH_CAP = 500;

function reviewKey(assetType: AssetType, sourceId: string): string {
  return `${assetType}:${sourceId}`;
}

interface TimedEvent {
  createdAt: Date;
}

// Generic "time from first start-event to first following end-event, per
// (assetType, sourceId)" computation — used for both review performance
// (NEEDS_REVIEW -> APPROVED) and publishing performance (PUBLISH_STARTED ->
// PUBLISHED). In-memory, matching this service layer's existing
// aggregation posture rather than a database-level rollup.
function computeAverageDuration<T extends TimedEvent>(
  eventsByKey: Map<string, T[]>,
  isStart: (event: T) => boolean,
  isEnd: (event: T) => boolean
): PerformanceMetricDto {
  const durations: number[] = [];

  for (const events of eventsByKey.values()) {
    const sorted = [...events].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    let pendingFrom: number | null = null;

    for (const event of sorted) {
      if (isStart(event)) {
        pendingFrom = event.createdAt.getTime();
      } else if (isEnd(event) && pendingFrom !== null) {
        durations.push(event.createdAt.getTime() - pendingFrom);
        pendingFrom = null;
      }
    }
  }

  if (durations.length === 0) {
    return { avgDurationMs: null, sampleSize: 0 };
  }

  const avg = durations.reduce((sum, value) => sum + value, 0) / durations.length;

  return { avgDurationMs: Math.round(avg), sampleSize: durations.length };
}

function groupByKey<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const key = keyOf(item);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }

  return map;
}

// Read-only — composes the existing repositories rather than introducing
// new storage (per the explicit "do not duplicate existing data"
// instruction). Aggregates in the service layer, matching AssetService's
// own established convention (ADR-0008), not raw SQL rollups. See
// ADR-0011.
export class AnalyticsService {
  constructor(
    private readonly contentRepository = new ContentRepository(),
    private readonly imageRepository = new ImageRepository(),
    private readonly videoAssetRepository = new VideoAssetRepository(),
    private readonly brandKitRepository = new BrandKitRepository(),
    private readonly savedPromptRepository = new SavedPromptRepository(),
    private readonly assetReviewRepository = new AssetReviewRepository(),
    private readonly publishingRecordRepository = new PublishingRecordRepository(),
    private readonly assetReviewEventRepository = new AssetReviewEventRepository(),
    private readonly analyticsEventRepository = new AnalyticsEventRepository(),
    private readonly projectRepository = new ProjectRepository()
  ) {}

  async getProjectSummary(
    projectId: string,
    userId: string
  ): Promise<ProjectAnalyticsSummaryDto> {
    const project = await this.projectRepository.findById(projectId, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    return this.summarizeProject(projectId, userId);
  }

  async getPlatformSummary(userId: string): Promise<ProjectAnalyticsSummaryDto> {
    const projects = await this.projectRepository.findMany({
      userId,
      skip: 0,
      take: FETCH_CAP,
    });

    const summaries = await Promise.all(
      projects.map((project) => this.summarizeProject(project.id, userId))
    );

    return mergeSummaries(summaries);
  }

  async getProjectActivity(
    projectId: string,
    userId: string,
    query: GetActivityQueryDto
  ): Promise<ActivityFeedResultDto> {
    const project = await this.projectRepository.findById(projectId, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    const [generationEvents, reviewEvents] = await Promise.all([
      this.analyticsEventRepository.findManyByProject(projectId),
      this.assetReviewEventRepository.findManyByProject(projectId),
    ]);

    return buildActivityFeed(generationEvents, reviewEvents, query);
  }

  // Sprint 6.6 (Production Dashboard) — the platform-wide "Recent activity"
  // tile needs every project the requesting user owns, not one. Reuses the
  // same merge/sort/paginate logic as getProjectActivity() rather than a
  // second implementation.
  async getPlatformActivity(
    userId: string,
    query: GetActivityQueryDto
  ): Promise<ActivityFeedResultDto> {
    const projects = await this.projectRepository.findMany({
      userId,
      skip: 0,
      take: FETCH_CAP,
    });
    const projectIds = projects.map((project) => project.id);

    const [generationEvents, reviewEvents] = await Promise.all([
      this.analyticsEventRepository.findManyByProjectIds(projectIds),
      this.assetReviewEventRepository.findManyByProjectIds(projectIds),
    ]);

    return buildActivityFeed(generationEvents, reviewEvents, query);
  }

  private async summarizeProject(
    projectId: string,
    userId: string
  ): Promise<ProjectAnalyticsSummaryDto> {
    const [
      contentRows,
      imageCount,
      videoCount,
      brandKits,
      prompts,
      reviews,
      publishingRecords,
      reviewEvents,
      providerGroups,
      brandKitGroups,
    ] = await Promise.all([
      this.contentRepository.findMany({ projectId, userId, skip: 0, take: FETCH_CAP }),
      this.imageRepository.count(projectId, userId),
      this.videoAssetRepository.count(projectId, userId),
      this.brandKitRepository.findManyByProject(projectId, userId),
      this.savedPromptRepository.findManyByProject(projectId, userId),
      this.assetReviewRepository.findManyByProject(projectId),
      this.publishingRecordRepository.findManyByProject(projectId),
      this.assetReviewEventRepository.findManyByProject(projectId),
      this.analyticsEventRepository.groupByProvider(projectId),
      this.analyticsEventRepository.groupByBrandKit(projectId),
    ]);

    const contentByType = new Map<AssetType, number>();
    for (const row of contentRows) {
      const assetType = row.type as AssetType;
      contentByType.set(assetType, (contentByType.get(assetType) ?? 0) + 1);
    }

    const allAssetCounts: AssetTypeCountDto[] = [
      ...Array.from(contentByType.entries()).map(([assetType, count]) => ({ assetType, count })),
      { assetType: "IMAGE" as AssetType, count: imageCount },
      { assetType: "VIDEO" as AssetType, count: videoCount },
      { assetType: "BRAND_KIT" as AssetType, count: brandKits.length },
      { assetType: "PROMPT_TEMPLATE" as AssetType, count: prompts.length },
    ];
    const assetCounts = allAssetCounts.filter((entry) => entry.count > 0);

    const totalAssets = assetCounts.reduce((sum, entry) => sum + entry.count, 0);

    const reviewStatusCounts = countBy(reviews, (review) => review.status);
    // No AssetReview row means implicitly DRAFT (ADR-0008) — folded in so
    // the counts reflect every asset, not only ones QA has touched.
    const reviewedCount = reviews.length;
    if (totalAssets > reviewedCount) {
      const draftEntry = reviewStatusCounts.find((entry) => entry.status === "DRAFT");
      const implicitDraftCount = totalAssets - reviewedCount;
      if (draftEntry) {
        draftEntry.count += implicitDraftCount;
      } else {
        reviewStatusCounts.push({ status: "DRAFT", count: implicitDraftCount });
      }
    }

    const publishingStatusCounts: PublishingStatusCountDto[] = countBy(
      publishingRecords,
      (record) => record.status
    );

    const providerUsage: ProviderUsageDto[] = providerGroups.map((group) => ({
      provider: group.provider as string,
      count: group._count._all,
      avgGenerationTimeMs:
        group._avg.generationTimeMs !== null ? Math.round(group._avg.generationTimeMs) : null,
    }));

    const brandKitUsage: BrandKitUsageDto[] = brandKitGroups.map((group) => ({
      brandKitId: group.brandKitId as string,
      count: group._count._all,
    }));

    const reviewEventsByAsset = groupByKey(reviewEvents, (event) =>
      reviewKey(event.assetType, event.sourceId)
    );

    const reviewPerformance = computeAverageDuration(
      reviewEventsByAsset,
      (event) => event.type === "STATUS_CHANGED" && event.toStatus === "NEEDS_REVIEW",
      (event) => event.type === "STATUS_CHANGED" && event.toStatus === "APPROVED"
    );

    const publishingPerformance = computeAverageDuration(
      reviewEventsByAsset,
      (event) => event.type === "PUBLISH_STARTED",
      (event) => event.type === "PUBLISHED"
    );

    return {
      totalAssets,
      assetCounts,
      reviewStatusCounts,
      publishingStatusCounts,
      providerUsage,
      brandKitUsage,
      reviewPerformance,
      publishingPerformance,
    };
  }
}

function countBy<T, S extends string>(
  rows: T[],
  keyOf: (row: T) => S
): { status: S; count: number }[] {
  const counts = new Map<S, number>();

  for (const row of rows) {
    const key = keyOf(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

type GenerationEventRow = Awaited<
  ReturnType<AnalyticsEventRepository["findManyByProject"]>
>[number];
type ReviewEventRow = Awaited<
  ReturnType<AssetReviewEventRepository["findManyByProject"]>
>[number];

// Shared by getProjectActivity()/getPlatformActivity() — merges the two
// event sources into one normalized, newest-first, paginated feed. No
// second timeline; both sources are reused as-is.
function buildActivityFeed(
  generationEvents: GenerationEventRow[],
  reviewEvents: ReviewEventRow[],
  query: GetActivityQueryDto
): ActivityFeedResultDto {
  const items: ActivityFeedItemDto[] = [
    ...generationEvents.map((event) => ({
      id: event.id,
      source: "generation" as const,
      type: event.type,
      actorId: event.actorId,
      actorName: event.actor.name,
      assetType: event.assetType,
      sourceId: event.sourceId,
      description: `${event.actor.name} generated a new ${event.assetType} asset`,
      createdAt: event.createdAt,
    })),
    ...reviewEvents.map((event) => ({
      id: event.id,
      source: "review" as const,
      type: event.type,
      actorId: event.actorId,
      actorName: event.actor.name,
      assetType: event.assetType,
      sourceId: event.sourceId,
      description: describeReviewEvent(event.actor.name, event.type),
      createdAt: event.createdAt,
    })),
  ];

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const total = items.length;
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

function describeReviewEvent(actorName: string, type: string): string {
  switch (type) {
    case "STATUS_CHANGED":
      return `${actorName} changed the review status`;
    case "COMMENT_ADDED":
      return `${actorName} added a comment`;
    case "COMMENT_RESOLVED":
      return `${actorName} resolved a comment`;
    case "ANNOTATION_ADDED":
      return `${actorName} added an annotation`;
    case "ASSIGNED":
      return `${actorName} assigned a reviewer`;
    case "UNASSIGNED":
      return `${actorName} removed a reviewer assignment`;
    case "VERSION_CREATED":
      return `${actorName} generated a new version`;
    case "PUBLISH_SCHEDULED":
      return `${actorName} scheduled publishing`;
    case "PUBLISH_STARTED":
      return `${actorName} started publishing`;
    case "PUBLISHED":
      return `${actorName} published an asset`;
    case "PUBLISH_FAILED":
      return `${actorName}'s publish attempt failed`;
    default:
      return `${actorName} performed an action`;
  }
}

// Weighted merge across a user's projects for the platform-wide summary —
// counts sum, averages are recombined weighted by their sample size rather
// than naively averaged, so a project with more data isn't diluted by one
// with almost none.
function mergeSummaries(
  summaries: ProjectAnalyticsSummaryDto[]
): ProjectAnalyticsSummaryDto {
  const assetCounts = mergeCounts(summaries.flatMap((s) => s.assetCounts), (e) => e.assetType);
  const reviewStatusCounts = mergeCounts(
    summaries.flatMap((s) => s.reviewStatusCounts),
    (e) => e.status
  );
  const publishingStatusCounts = mergeCounts(
    summaries.flatMap((s) => s.publishingStatusCounts),
    (e) => e.status
  );
  const brandKitUsage = mergeCounts(
    summaries.flatMap((s) => s.brandKitUsage),
    (e) => e.brandKitId
  );

  const providerTotals = new Map<string, { count: number; totalMs: number }>();
  for (const summary of summaries) {
    for (const usage of summary.providerUsage) {
      const existing = providerTotals.get(usage.provider) ?? { count: 0, totalMs: 0 };
      existing.count += usage.count;
      existing.totalMs += (usage.avgGenerationTimeMs ?? 0) * usage.count;
      providerTotals.set(usage.provider, existing);
    }
  }
  const providerUsage: ProviderUsageDto[] = Array.from(providerTotals.entries()).map(
    ([provider, { count, totalMs }]) => ({
      provider,
      count,
      avgGenerationTimeMs: count > 0 ? Math.round(totalMs / count) : null,
    })
  );

  return {
    totalAssets: summaries.reduce((sum, s) => sum + s.totalAssets, 0),
    assetCounts: assetCounts as AssetTypeCountDto[],
    reviewStatusCounts: reviewStatusCounts as ReviewStatusCountDto[],
    publishingStatusCounts: publishingStatusCounts as PublishingStatusCountDto[],
    providerUsage,
    brandKitUsage: brandKitUsage as BrandKitUsageDto[],
    reviewPerformance: mergePerformance(summaries.map((s) => s.reviewPerformance)),
    publishingPerformance: mergePerformance(summaries.map((s) => s.publishingPerformance)),
  };
}

function mergeCounts<T extends { count: number }>(
  entries: T[],
  keyOf: (entry: T) => string
): T[] {
  const map = new Map<string, T>();

  for (const entry of entries) {
    const key = keyOf(entry);
    const existing = map.get(key);
    if (existing) {
      existing.count += entry.count;
    } else {
      map.set(key, { ...entry });
    }
  }

  return Array.from(map.values());
}

function mergePerformance(metrics: PerformanceMetricDto[]): PerformanceMetricDto {
  const totalSamples = metrics.reduce((sum, m) => sum + m.sampleSize, 0);

  if (totalSamples === 0) {
    return { avgDurationMs: null, sampleSize: 0 };
  }

  const weightedTotal = metrics.reduce(
    (sum, m) => sum + (m.avgDurationMs ?? 0) * m.sampleSize,
    0
  );

  return {
    avgDurationMs: Math.round(weightedTotal / totalSamples),
    sampleSize: totalSamples,
  };
}

export const analyticsService = new AnalyticsService();
