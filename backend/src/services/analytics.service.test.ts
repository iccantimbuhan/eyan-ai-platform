import { describe, expect, it, vi } from "vitest";

import { AnalyticsService } from "./analytics.service.js";

function createContentRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createImageRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    count: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function createVideoAssetRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    count: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function createBrandKitRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByProject: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createSavedPromptRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByProject: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createAssetReviewRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByProject: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createPublishingRecordRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByProject: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createAssetReviewEventRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByProject: vi.fn().mockResolvedValue([]),
    findManyByProjectIds: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createAnalyticsEventRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByProject: vi.fn().mockResolvedValue([]),
    findManyByProjectIds: vi.fn().mockResolvedValue([]),
    groupByProvider: vi.fn().mockResolvedValue([]),
    groupByBrandKit: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createProjectRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "proj-1", userId: "user-1" }),
    findMany: vi.fn().mockResolvedValue([{ id: "proj-1", userId: "user-1" }]),
    ...overrides,
  };
}

interface Deps {
  contentRepository?: Partial<Record<string, unknown>>;
  imageRepository?: Partial<Record<string, unknown>>;
  videoAssetRepository?: Partial<Record<string, unknown>>;
  brandKitRepository?: Partial<Record<string, unknown>>;
  savedPromptRepository?: Partial<Record<string, unknown>>;
  assetReviewRepository?: Partial<Record<string, unknown>>;
  publishingRecordRepository?: Partial<Record<string, unknown>>;
  assetReviewEventRepository?: Partial<Record<string, unknown>>;
  analyticsEventRepository?: Partial<Record<string, unknown>>;
  projectRepository?: Partial<Record<string, unknown>>;
}

function buildService(deps: Deps = {}) {
  const contentRepository = createContentRepository(deps.contentRepository);
  const imageRepository = createImageRepository(deps.imageRepository);
  const videoAssetRepository = createVideoAssetRepository(deps.videoAssetRepository);
  const brandKitRepository = createBrandKitRepository(deps.brandKitRepository);
  const savedPromptRepository = createSavedPromptRepository(deps.savedPromptRepository);
  const assetReviewRepository = createAssetReviewRepository(deps.assetReviewRepository);
  const publishingRecordRepository = createPublishingRecordRepository(
    deps.publishingRecordRepository
  );
  const assetReviewEventRepository = createAssetReviewEventRepository(
    deps.assetReviewEventRepository
  );
  const analyticsEventRepository = createAnalyticsEventRepository(
    deps.analyticsEventRepository
  );
  const projectRepository = createProjectRepository(deps.projectRepository);

  const service = new AnalyticsService(
    contentRepository as never,
    imageRepository as never,
    videoAssetRepository as never,
    brandKitRepository as never,
    savedPromptRepository as never,
    assetReviewRepository as never,
    publishingRecordRepository as never,
    assetReviewEventRepository as never,
    analyticsEventRepository as never,
    projectRepository as never
  );

  return {
    service,
    contentRepository,
    imageRepository,
    videoAssetRepository,
    brandKitRepository,
    savedPromptRepository,
    assetReviewRepository,
    publishingRecordRepository,
    assetReviewEventRepository,
    analyticsEventRepository,
    projectRepository,
  };
}

describe("AnalyticsService.getProjectSummary", () => {
  it("throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
    const { service } = buildService({
      projectRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getProjectSummary("proj-1", "user-2")).rejects.toThrow(
      "Project not found."
    );
  });

  it("counts assets by type across every source, omitting zero-count types", async () => {
    const { service } = buildService({
      contentRepository: {
        findMany: vi.fn().mockResolvedValue([
          { type: "BLOG" },
          { type: "BLOG" },
          { type: "EMAIL" },
        ]),
      },
      imageRepository: { count: vi.fn().mockResolvedValue(2) },
      videoAssetRepository: { count: vi.fn().mockResolvedValue(0) },
      brandKitRepository: { findManyByProject: vi.fn().mockResolvedValue([{ id: "bk-1" }]) },
    });

    const summary = await service.getProjectSummary("proj-1", "user-1");

    expect(summary.assetCounts).toEqual(
      expect.arrayContaining([
        { assetType: "BLOG", count: 2 },
        { assetType: "EMAIL", count: 1 },
        { assetType: "IMAGE", count: 2 },
        { assetType: "BRAND_KIT", count: 1 },
      ])
    );
    expect(summary.assetCounts.some((entry) => entry.assetType === "VIDEO")).toBe(false);
    expect(summary.totalAssets).toBe(6);
  });

  it("folds assets with no AssetReview row into an implicit DRAFT count", async () => {
    const { service } = buildService({
      contentRepository: { findMany: vi.fn().mockResolvedValue([{ type: "BLOG" }, { type: "BLOG" }]) },
      assetReviewRepository: {
        findManyByProject: vi.fn().mockResolvedValue([{ status: "APPROVED" }]),
      },
    });

    const summary = await service.getProjectSummary("proj-1", "user-1");

    expect(summary.reviewStatusCounts).toEqual(
      expect.arrayContaining([
        { status: "APPROVED", count: 1 },
        { status: "DRAFT", count: 1 },
      ])
    );
  });

  it("groups publishing records by status", async () => {
    const { service } = buildService({
      contentRepository: { findMany: vi.fn().mockResolvedValue([{ type: "BLOG" }]) },
      publishingRecordRepository: {
        findManyByProject: vi
          .fn()
          .mockResolvedValue([{ status: "PUBLISHED" }, { status: "FAILED" }, { status: "FAILED" }]),
      },
    });

    const summary = await service.getProjectSummary("proj-1", "user-1");

    expect(summary.publishingStatusCounts).toEqual(
      expect.arrayContaining([
        { status: "PUBLISHED", count: 1 },
        { status: "FAILED", count: 2 },
      ])
    );
  });

  it("maps provider usage and brand kit usage from the analytics-event groupBy results", async () => {
    const { service } = buildService({
      analyticsEventRepository: {
        groupByProvider: vi.fn().mockResolvedValue([
          { provider: "fake", _count: { _all: 3 }, _avg: { generationTimeMs: 100 } },
        ]),
        groupByBrandKit: vi
          .fn()
          .mockResolvedValue([{ brandKitId: "bk-1", _count: { _all: 2 } }]),
      },
    });

    const summary = await service.getProjectSummary("proj-1", "user-1");

    expect(summary.providerUsage).toEqual([
      { provider: "fake", count: 3, avgGenerationTimeMs: 100 },
    ]);
    expect(summary.brandKitUsage).toEqual([{ brandKitId: "bk-1", count: 2 }]);
  });

  it("computes review performance as the average time from NEEDS_REVIEW to APPROVED", async () => {
    const base = new Date("2026-01-01T00:00:00.000Z").getTime();
    const { service } = buildService({
      assetReviewEventRepository: {
        findManyByProject: vi.fn().mockResolvedValue([
          {
            assetType: "IMAGE",
            sourceId: "image-1",
            type: "STATUS_CHANGED",
            toStatus: "NEEDS_REVIEW",
            createdAt: new Date(base),
          },
          {
            assetType: "IMAGE",
            sourceId: "image-1",
            type: "STATUS_CHANGED",
            toStatus: "APPROVED",
            createdAt: new Date(base + 10_000),
          },
        ]),
      },
    });

    const summary = await service.getProjectSummary("proj-1", "user-1");

    expect(summary.reviewPerformance).toEqual({ avgDurationMs: 10_000, sampleSize: 1 });
  });

  it("returns a null average and zero sample size when no review has ever been completed", async () => {
    const { service } = buildService();

    const summary = await service.getProjectSummary("proj-1", "user-1");

    expect(summary.reviewPerformance).toEqual({ avgDurationMs: null, sampleSize: 0 });
    expect(summary.publishingPerformance).toEqual({ avgDurationMs: null, sampleSize: 0 });
  });

  it("computes publishing performance as the average time from PUBLISH_STARTED to PUBLISHED", async () => {
    const base = new Date("2026-01-01T00:00:00.000Z").getTime();
    const { service } = buildService({
      assetReviewEventRepository: {
        findManyByProject: vi.fn().mockResolvedValue([
          {
            assetType: "IMAGE",
            sourceId: "image-1",
            type: "PUBLISH_STARTED",
            toStatus: null,
            createdAt: new Date(base),
          },
          {
            assetType: "IMAGE",
            sourceId: "image-1",
            type: "PUBLISHED",
            toStatus: null,
            createdAt: new Date(base + 5_000),
          },
        ]),
      },
    });

    const summary = await service.getProjectSummary("proj-1", "user-1");

    expect(summary.publishingPerformance).toEqual({ avgDurationMs: 5_000, sampleSize: 1 });
  });
});

describe("AnalyticsService.getProjectActivity", () => {
  it("throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
    const { service } = buildService({
      projectRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.getProjectActivity("proj-1", "user-2", {})
    ).rejects.toThrow("Project not found.");
  });

  it("merges generation and review events, sorted newest-first", async () => {
    const older = new Date("2026-01-01T00:00:00.000Z");
    const newer = new Date("2026-01-02T00:00:00.000Z");

    const { service } = buildService({
      analyticsEventRepository: {
        findManyByProject: vi.fn().mockResolvedValue([
          {
            id: "gen-1",
            type: "GENERATED",
            actorId: "user-1",
            actor: { name: "Ada Lovelace" },
            assetType: "IMAGE",
            sourceId: "image-1",
            createdAt: older,
          },
        ]),
      },
      assetReviewEventRepository: {
        findManyByProject: vi.fn().mockResolvedValue([
          {
            id: "event-1",
            type: "STATUS_CHANGED",
            actorId: "user-1",
            actor: { name: "Ada Lovelace" },
            assetType: "IMAGE",
            sourceId: "image-1",
            createdAt: newer,
          },
        ]),
      },
    });

    const activity = await service.getProjectActivity("proj-1", "user-1", {});

    expect(activity.items.map((item) => item.id)).toEqual(["event-1", "gen-1"]);
    expect(activity.items[0].source).toBe("review");
    expect(activity.items[1].source).toBe("generation");
    expect(activity.pagination).toEqual({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
  });

  it("paginates the merged feed", async () => {
    const events = Array.from({ length: 25 }, (_, i) => ({
      id: `event-${i}`,
      type: "STATUS_CHANGED",
      actorId: "user-1",
      actor: { name: "Ada Lovelace" },
      assetType: "IMAGE" as const,
      sourceId: "image-1",
      createdAt: new Date(2026, 0, i + 1),
    }));

    const { service } = buildService({
      assetReviewEventRepository: {
        findManyByProject: vi.fn().mockResolvedValue(events),
      },
    });

    const activity = await service.getProjectActivity("proj-1", "user-1", {
      page: 2,
      pageSize: 10,
    });

    expect(activity.items).toHaveLength(10);
    expect(activity.pagination).toEqual({ page: 2, pageSize: 10, total: 25, totalPages: 3 });
  });
});

describe("AnalyticsService.getPlatformActivity", () => {
  it("fetches every project the user owns and merges generation/review events across all of them", async () => {
    const projectRepository = createProjectRepository({
      findMany: vi.fn().mockResolvedValue([
        { id: "proj-1", userId: "user-1" },
        { id: "proj-2", userId: "user-1" },
      ]),
    });
    const analyticsEventRepository = createAnalyticsEventRepository({
      findManyByProjectIds: vi.fn().mockResolvedValue([
        {
          id: "gen-1",
          type: "GENERATED",
          actorId: "user-1",
          actor: { name: "Ada Lovelace" },
          assetType: "IMAGE",
          sourceId: "image-1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]),
    });
    const assetReviewEventRepository = createAssetReviewEventRepository({
      findManyByProjectIds: vi.fn().mockResolvedValue([
        {
          id: "event-1",
          type: "STATUS_CHANGED",
          actorId: "user-1",
          actor: { name: "Ada Lovelace" },
          assetType: "IMAGE",
          sourceId: "image-1",
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      ]),
    });

    const { service } = buildService({
      projectRepository,
      analyticsEventRepository,
      assetReviewEventRepository,
    });

    const activity = await service.getPlatformActivity("user-1", {});

    expect(analyticsEventRepository.findManyByProjectIds).toHaveBeenCalledWith([
      "proj-1",
      "proj-2",
    ]);
    expect(assetReviewEventRepository.findManyByProjectIds).toHaveBeenCalledWith([
      "proj-1",
      "proj-2",
    ]);
    expect(activity.items.map((item) => item.id)).toEqual(["event-1", "gen-1"]);
    expect(activity.pagination).toEqual({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
  });

  it("paginates the merged platform-wide feed", async () => {
    const projectRepository = createProjectRepository({
      findMany: vi.fn().mockResolvedValue([{ id: "proj-1", userId: "user-1" }]),
    });
    const events = Array.from({ length: 15 }, (_, i) => ({
      id: `event-${i}`,
      type: "STATUS_CHANGED",
      actorId: "user-1",
      actor: { name: "Ada Lovelace" },
      assetType: "IMAGE" as const,
      sourceId: "image-1",
      createdAt: new Date(2026, 0, i + 1),
    }));

    const { service } = buildService({
      projectRepository,
      assetReviewEventRepository: {
        findManyByProjectIds: vi.fn().mockResolvedValue(events),
      },
    });

    const activity = await service.getPlatformActivity("user-1", { page: 1, pageSize: 5 });

    expect(activity.items).toHaveLength(5);
    expect(activity.pagination).toEqual({ page: 1, pageSize: 5, total: 15, totalPages: 3 });
  });
});

describe("AnalyticsService.getPlatformSummary", () => {
  it("merges counts and weighted-averages performance metrics across every one of the user's projects", async () => {
    const projectRepository = createProjectRepository({
      findMany: vi.fn().mockResolvedValue([
        { id: "proj-1", userId: "user-1" },
        { id: "proj-2", userId: "user-1" },
      ]),
    });

    const contentRepository = createContentRepository({
      findMany: vi
        .fn()
        .mockResolvedValueOnce([{ type: "BLOG" }])
        .mockResolvedValueOnce([{ type: "BLOG" }, { type: "BLOG" }]),
    });

    const { service } = buildService({ projectRepository, contentRepository });

    const summary = await service.getPlatformSummary("user-1");

    expect(summary.assetCounts).toEqual([{ assetType: "BLOG", count: 3 }]);
    expect(summary.totalAssets).toBe(3);
  });
});
