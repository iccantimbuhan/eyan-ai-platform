import { describe, expect, it, vi } from "vitest";

import { AssetService } from "./asset.service.js";
import { AssetActionNotSupportedError } from "../errors/asset.error.js";

const contentRow = {
  id: "content-1",
  projectId: "proj-1",
  type: "BLOG",
  prompt: "Write about cats",
  output: "Cats are great",
  model: "qwen2.5-coder:7b",
  createdBy: "user-1",
  generationTimeMs: 1200,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const imageRow = {
  id: "image-1",
  projectId: "proj-1",
  prompt: "A cat",
  negativePrompt: null,
  provider: "fake",
  model: "fake-image-v1",
  width: 512,
  height: 512,
  format: "PNG",
  storagePath: "proj-1/uuid.png",
  thumbnailPath: null,
  status: "COMPLETED",
  errorMessage: null,
  generationTimeMs: 800,
  createdAt: new Date("2026-01-02T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

const promptRow = {
  id: "prompt-1",
  userId: "user-1",
  projectId: "proj-1",
  name: "SEO Intro",
  promptBody: "Write an SEO intro about {{topic}}",
  contentType: "BLOG",
  createdAt: new Date("2026-01-03T00:00:00.000Z"),
  updatedAt: new Date("2026-01-03T00:00:00.000Z"),
};

const globalPromptRow = { ...promptRow, id: "prompt-global", projectId: null };

const brandKitRow = {
  id: "bk-1",
  projectId: "proj-1",
  createdBy: "user-1",
  name: "Acme Brand Kit",
  client: "Acme Corp",
  logos: null,
  primaryColors: null,
  secondaryColors: null,
  fonts: null,
  typography: null,
  toneOfVoice: "Confident and friendly",
  writingStyle: null,
  audience: "Small business owners",
  ctaStyle: null,
  approvedTerminology: ["Acme"],
  restrictedWords: ["cheap"],
  brandGuidelines: "Always capitalize Acme.",
  imageStyle: null,
  socialMediaGuidelines: null,
  isDefault: false,
  createdAt: new Date("2026-01-04T00:00:00.000Z"),
  updatedAt: new Date("2026-01-04T00:00:00.000Z"),
};

const videoTextRow = {
  id: "video-1",
  projectId: "proj-1",
  brandKitId: null,
  videoGroupId: "group-1",
  kind: "SCRIPT",
  prompt: "A launch video",
  output: "INT. LAUNCH PAD - DAY",
  provider: null,
  width: null,
  height: null,
  format: null,
  storagePath: null,
  thumbnailPath: null,
  model: "qwen2.5-coder:7b",
  status: "COMPLETED",
  errorMessage: null,
  generationTimeMs: 900,
  createdBy: "user-1",
  createdAt: new Date("2026-01-06T00:00:00.000Z"),
  updatedAt: new Date("2026-01-06T00:00:00.000Z"),
};

const videoImageRow = {
  ...videoTextRow,
  id: "video-2",
  kind: "STORYBOARD",
  output: null,
  provider: "fake",
  width: 512,
  height: 512,
  format: "PNG",
  storagePath: "proj-1/uuid.png",
  model: "fake-image-v1",
};

function createContentRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findMany: vi.fn().mockResolvedValue([contentRow]),
    findById: vi.fn().mockResolvedValue(contentRow),
    create: vi.fn().mockResolvedValue({ id: "content-2" }),
    ...overrides,
  };
}

function createImageRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findMany: vi.fn().mockResolvedValue([imageRow]),
    findById: vi.fn().mockResolvedValue(imageRow),
    ...overrides,
  };
}

function createSavedPromptRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByProject: vi.fn().mockResolvedValue([promptRow]),
    findById: vi.fn().mockResolvedValue(promptRow),
    create: vi.fn().mockResolvedValue({ id: "prompt-2" }),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createBrandKitRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByProject: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(brandKitRow),
    create: vi.fn().mockResolvedValue({ id: "bk-2" }),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createVideoAssetRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(videoTextRow),
    create: vi.fn().mockResolvedValue({ id: "video-3" }),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createAssetReviewRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyBySourceIds: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({}),
    deleteBySource: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createAssetVersionRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyBySourceIds: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    findLineage: vi.fn().mockResolvedValue([]),
    createFirstVersion: vi
      .fn()
      .mockResolvedValue({ id: "version-1", lineageId: "version-1", versionNumber: 1 }),
    createNextVersion: vi
      .fn()
      .mockResolvedValue({ id: "version-2", lineageId: "version-1", versionNumber: 2 }),
    ...overrides,
  };
}

function createProjectRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "proj-1", name: "My Project", userId: "user-1" }),
    ...overrides,
  };
}

function createContentService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    generate: vi.fn().mockResolvedValue({ id: "content-2" }),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createImageService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    generate: vi.fn().mockResolvedValue({ id: "image-2" }),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createVideoAssetService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    generate: vi.fn().mockResolvedValue({ id: "video-3" }),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createAssetCommentRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({}),
    findManyBySource: vi.fn().mockResolvedValue([]),
    findManyBySourceIds: vi.fn().mockResolvedValue([]),
    resolve: vi.fn().mockResolvedValue({}),
    findById: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createAssetReviewAssignmentRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    upsert: vi.fn().mockResolvedValue({}),
    findOne: vi.fn().mockResolvedValue(null),
    findManyBySourceIds: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createAssetReviewEventRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({}),
    findManyBySource: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createUserRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "user-1", name: "Ada Lovelace" }),
    ...overrides,
  };
}

const publishingRecordBase = {
  id: "pub-1",
  assetType: "IMAGE",
  sourceId: "image-1",
  platform: "fake",
  status: "DRAFT",
  scheduledFor: null,
  publishedAt: null,
  externalId: null,
  externalUrl: null,
  errorMessage: null,
  attempts: 0,
  createdAt: new Date("2026-01-10T00:00:00.000Z"),
  updatedAt: new Date("2026-01-10T00:00:00.000Z"),
};

function createPublishingRecordRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    upsert: vi.fn().mockResolvedValue(publishingRecordBase),
    update: vi
      .fn()
      .mockImplementation((id: string, data: Record<string, unknown>) =>
        Promise.resolve({ ...publishingRecordBase, id, ...data })
      ),
    findOne: vi.fn().mockResolvedValue(null),
    findManyBySource: vi.fn().mockResolvedValue([]),
    findManyBySourceIds: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createPlatformProviderFactory(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockReturnValue({
      name: "fake",
      publish: vi.fn().mockResolvedValue({
        externalId: "fake-image-image-1",
        externalUrl: "https://fake-platform.example.com/posts/image-image-1",
      }),
    }),
    ...overrides,
  };
}

interface Deps {
  contentRepository?: Partial<Record<string, unknown>>;
  imageRepository?: Partial<Record<string, unknown>>;
  savedPromptRepository?: Partial<Record<string, unknown>>;
  brandKitRepository?: Partial<Record<string, unknown>>;
  videoAssetRepository?: Partial<Record<string, unknown>>;
  assetReviewRepository?: Partial<Record<string, unknown>>;
  assetVersionRepository?: Partial<Record<string, unknown>>;
  projectRepository?: Partial<Record<string, unknown>>;
  contentService?: Partial<Record<string, unknown>>;
  imageService?: Partial<Record<string, unknown>>;
  videoAssetService?: Partial<Record<string, unknown>>;
  assetCommentRepository?: Partial<Record<string, unknown>>;
  assetReviewAssignmentRepository?: Partial<Record<string, unknown>>;
  assetReviewEventRepository?: Partial<Record<string, unknown>>;
  userRepository?: Partial<Record<string, unknown>>;
  publishingRecordRepository?: Partial<Record<string, unknown>>;
  platformProviderFactory?: Partial<Record<string, unknown>>;
}

function buildService(deps: Deps = {}) {
  const contentRepository = createContentRepository(deps.contentRepository);
  const imageRepository = createImageRepository(deps.imageRepository);
  const savedPromptRepository = createSavedPromptRepository(deps.savedPromptRepository);
  const brandKitRepository = createBrandKitRepository(deps.brandKitRepository);
  const videoAssetRepository = createVideoAssetRepository(deps.videoAssetRepository);
  const assetReviewRepository = createAssetReviewRepository(deps.assetReviewRepository);
  const assetVersionRepository = createAssetVersionRepository(deps.assetVersionRepository);
  const projectRepository = createProjectRepository(deps.projectRepository);
  const contentService = createContentService(deps.contentService);
  const imageService = createImageService(deps.imageService);
  const videoAssetService = createVideoAssetService(deps.videoAssetService);
  const assetCommentRepository = createAssetCommentRepository(deps.assetCommentRepository);
  const assetReviewAssignmentRepository = createAssetReviewAssignmentRepository(
    deps.assetReviewAssignmentRepository
  );
  const assetReviewEventRepository = createAssetReviewEventRepository(
    deps.assetReviewEventRepository
  );
  const userRepository = createUserRepository(deps.userRepository);
  const publishingRecordRepository = createPublishingRecordRepository(
    deps.publishingRecordRepository
  );
  const platformProviderFactory = createPlatformProviderFactory(deps.platformProviderFactory);

  const service = new AssetService(
    contentRepository as never,
    imageRepository as never,
    savedPromptRepository as never,
    brandKitRepository as never,
    videoAssetRepository as never,
    assetReviewRepository as never,
    assetVersionRepository as never,
    projectRepository as never,
    contentService as never,
    imageService as never,
    videoAssetService as never,
    assetCommentRepository as never,
    assetReviewAssignmentRepository as never,
    assetReviewEventRepository as never,
    userRepository as never,
    publishingRecordRepository as never,
    platformProviderFactory as never
  );

  return {
    service,
    contentRepository,
    imageRepository,
    savedPromptRepository,
    brandKitRepository,
    videoAssetRepository,
    assetReviewRepository,
    assetVersionRepository,
    projectRepository,
    contentService,
    imageService,
    videoAssetService,
    assetCommentRepository,
    assetReviewAssignmentRepository,
    assetReviewEventRepository,
    userRepository,
    publishingRecordRepository,
    platformProviderFactory,
  };
}

describe("AssetService.list", () => {
  it("throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
    const { service } = buildService({
      projectRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.list({ projectId: "proj-1" }, "user-2")).rejects.toThrow(
      "Project not found."
    );
  });

  it("merges content, image, and prompt-template sources, newest first by default", async () => {
    const { service } = buildService();

    const result = await service.list({ projectId: "proj-1" }, "user-1");

    expect(result.items.map((item) => item.id)).toEqual([
      "prompt-1",
      "image-1",
      "content-1",
    ]);
    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 3, totalPages: 1 });
  });

  it("defaults an asset with no AssetReview row to DRAFT and version 1", async () => {
    const { service } = buildService();

    const result = await service.list({ projectId: "proj-1" }, "user-1");

    for (const item of result.items) {
      expect(item.status).toBe("DRAFT");
      expect(item.version).toBe(1);
    }
  });

  it("applies a persisted review status and version number when present", async () => {
    const { service } = buildService({
      assetReviewRepository: {
        findManyBySourceIds: vi
          .fn()
          .mockResolvedValue([
            { assetType: "IMAGE", sourceId: "image-1", status: "APPROVED" },
          ]),
      },
      assetVersionRepository: {
        findManyBySourceIds: vi
          .fn()
          .mockResolvedValue([
            { assetType: "IMAGE", sourceId: "image-1", versionNumber: 3 },
          ]),
      },
    });

    const result = await service.list({ projectId: "proj-1" }, "user-1");
    const image = result.items.find((item) => item.id === "image-1");

    expect(image?.status).toBe("APPROVED");
    expect(image?.version).toBe(3);
  });

  it("filters by status", async () => {
    const { service } = buildService({
      assetReviewRepository: {
        findManyBySourceIds: vi
          .fn()
          .mockResolvedValue([
            { assetType: "IMAGE", sourceId: "image-1", status: "APPROVED" },
          ]),
      },
    });

    const result = await service.list(
      { projectId: "proj-1", status: "APPROVED" },
      "user-1"
    );

    expect(result.items.map((item) => item.id)).toEqual(["image-1"]);
  });

  it("filters by asset type, skipping the other sources entirely", async () => {
    const { service, contentRepository, savedPromptRepository } = buildService();

    const result = await service.list({ projectId: "proj-1", type: "IMAGE" }, "user-1");

    expect(result.items.map((item) => item.id)).toEqual(["image-1"]);
    expect(contentRepository.findMany).not.toHaveBeenCalled();
    expect(savedPromptRepository.findManyByProject).not.toHaveBeenCalled();
  });

  it("searches across title, prompt, provider, model, and project name", async () => {
    const { service } = buildService();

    const result = await service.list({ projectId: "proj-1", search: "cats" }, "user-1");

    expect(result.items.map((item) => item.id)).toEqual(["content-1"]);
  });

  it("includes a brand kit as a first-class asset when present", async () => {
    const { service } = buildService({
      brandKitRepository: { findManyByProject: vi.fn().mockResolvedValue([brandKitRow]) },
    });

    const result = await service.list({ projectId: "proj-1" }, "user-1");

    expect(result.items.map((item) => item.id)).toContain("bk-1");
    const brandKitItem = result.items.find((item) => item.id === "bk-1");
    expect(brandKitItem?.assetType).toBe("BRAND_KIT");
    expect(brandKitItem?.provider).toBeNull();
  });

  it("includes video assets as first-class assets, reporting the constant text provider for text kinds and the real provider for image kinds", async () => {
    const { service } = buildService({
      videoAssetRepository: {
        findMany: vi.fn().mockResolvedValue([videoTextRow, videoImageRow]),
      },
    });

    const result = await service.list({ projectId: "proj-1" }, "user-1");

    expect(result.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["video-1", "video-2"])
    );
    const textItem = result.items.find((item) => item.id === "video-1");
    const imageItem = result.items.find((item) => item.id === "video-2");
    expect(textItem?.assetType).toBe("VIDEO");
    expect(textItem?.provider).toBe("ollama");
    expect(imageItem?.provider).toBe("fake");
    expect(imageItem?.thumbnailUrl).toBe("proj-1/uuid.png");
  });

  it("paginates the merged, sorted result set", async () => {
    const { service } = buildService();

    const result = await service.list(
      { projectId: "proj-1", page: 2, pageSize: 1 },
      "user-1"
    );

    expect(result.items.map((item) => item.id)).toEqual(["image-1"]);
    expect(result.pagination).toEqual({ page: 2, pageSize: 1, total: 3, totalPages: 3 });
  });
});

describe("AssetService.getDetail", () => {
  it("throws NotFoundError for an unknown or unowned image", async () => {
    const { service } = buildService({
      imageRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getDetail("IMAGE", "image-1", "user-2")).rejects.toThrow(
      "Asset not found."
    );
  });

  it("throws NotFoundError for a content row whose type doesn't match the requested assetType", async () => {
    const { service } = buildService();

    await expect(service.getDetail("EMAIL", "content-1", "user-1")).rejects.toThrow(
      "Asset not found."
    );
  });

  it("throws NotFoundError for a global (non-project-scoped) prompt", async () => {
    const { service } = buildService({
      savedPromptRepository: {
        findById: vi.fn().mockResolvedValue(globalPromptRow),
      },
    });

    await expect(
      service.getDetail("PROMPT_TEMPLATE", "prompt-global", "user-1")
    ).rejects.toThrow("Asset not found.");
  });

  it("returns full detail for an image, including generationTimeMs and negativePrompt", async () => {
    const { service } = buildService();

    const detail = await service.getDetail("IMAGE", "image-1", "user-1");

    expect(detail.generationTimeMs).toBe(800);
    expect(detail.negativePrompt).toBeNull();
    expect(detail.provider).toBe("fake");
    expect(detail.projectName).toBe("My Project");
  });

  it("returns full detail for a brand kit, falling back to its guidelines as the 'prompt' field", async () => {
    const { service } = buildService();

    const detail = await service.getDetail("BRAND_KIT", "bk-1", "user-1");

    expect(detail.title).toBe("Acme Brand Kit");
    expect(detail.provider).toBeNull();
    expect(detail.prompt).toBe("Always capitalize Acme.");
  });

  it("returns full detail for a video asset, including its kind in the title and its output", async () => {
    const { service } = buildService();

    const detail = await service.getDetail("VIDEO", "video-1", "user-1");

    expect(detail.title).toBe("Script — A launch video");
    expect(detail.output).toBe("INT. LAUNCH PAD - DAY");
    expect(detail.provider).toBe("ollama");
  });

  it("includes reviewer name, notes, and checklist once a review exists", async () => {
    const reviewedAt = new Date("2026-01-05T00:00:00.000Z");
    const { service } = buildService({
      assetReviewRepository: {
        findOne: vi.fn().mockResolvedValue({
          status: "APPROVED",
          reviewerId: "reviewer-1",
          reviewer: { name: "Jane QA" },
          reviewedAt,
          notes: "Looks good",
          qaScore: 90,
          checklist: [{ category: "images", item: "Safety", result: "PASS" }],
        }),
      },
    });

    const detail = await service.getDetail("IMAGE", "image-1", "user-1");

    expect(detail.status).toBe("APPROVED");
    expect(detail.reviewerName).toBe("Jane QA");
    expect(detail.reviewedAt).toEqual(reviewedAt);
    expect(detail.notes).toBe("Looks good");
    expect(detail.qaScore).toBe(90);
    expect(detail.checklist).toEqual([
      { category: "images", item: "Safety", result: "PASS" },
    ]);
  });
});

describe("AssetService.review", () => {
  it("throws NotFoundError when the asset doesn't exist or isn't owned by the caller", async () => {
    const { service } = buildService({
      imageRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.review("IMAGE", "image-1", { notes: "x" }, "reviewer-1", "user-2")
    ).rejects.toThrow("Asset not found.");
  });

  it("does not set reviewerId/reviewedAt when the payload has no status change", async () => {
    const { service, assetReviewRepository } = buildService();

    await service.review("IMAGE", "image-1", { notes: "Looks fine" }, "reviewer-1", "user-1");

    const [, , , payload] = assetReviewRepository.upsert.mock.calls[0];
    expect(payload).toEqual(expect.objectContaining({ notes: "Looks fine" }));
    expect(payload).not.toHaveProperty("reviewerId");
    expect(payload).not.toHaveProperty("reviewedAt");
    expect(payload).not.toHaveProperty("status");
  });

  it("sets reviewerId and a fresh reviewedAt when status is included", async () => {
    const { service, assetReviewRepository } = buildService();

    await service.review("IMAGE", "image-1", { status: "APPROVED" }, "reviewer-1", "user-1");

    expect(assetReviewRepository.upsert).toHaveBeenCalledWith(
      "IMAGE",
      "image-1",
      "proj-1",
      expect.objectContaining({
        status: "APPROVED",
        reviewerId: "reviewer-1",
        reviewedAt: expect.any(Date),
      })
    );
  });

  it("writes a STATUS_CHANGED event when the status actually changes", async () => {
    const { service, assetReviewRepository, assetReviewEventRepository } = buildService({
      assetReviewRepository: createAssetReviewRepository({
        findOne: vi.fn().mockResolvedValue({ status: "NEEDS_REVIEW" }),
      }),
    });

    await service.review("IMAGE", "image-1", { status: "APPROVED" }, "reviewer-1", "user-1");

    expect(assetReviewRepository.upsert).toHaveBeenCalled();
    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        assetType: "IMAGE",
        sourceId: "image-1",
        type: "STATUS_CHANGED",
        actorId: "reviewer-1",
        fromStatus: "NEEDS_REVIEW",
        toStatus: "APPROVED",
      })
    );
  });

  it("does not write a STATUS_CHANGED event when the status is unchanged", async () => {
    const { service, assetReviewEventRepository } = buildService({
      assetReviewRepository: createAssetReviewRepository({
        findOne: vi.fn().mockResolvedValue({ status: "APPROVED" }),
      }),
    });

    await service.review("IMAGE", "image-1", { status: "APPROVED" }, "reviewer-1", "user-1");

    expect(assetReviewEventRepository.create).not.toHaveBeenCalled();
  });

  it("does not write a STATUS_CHANGED event when no status is provided", async () => {
    const { service, assetReviewEventRepository } = buildService();

    await service.review("IMAGE", "image-1", { notes: "just a note" }, "reviewer-1", "user-1");

    expect(assetReviewEventRepository.create).not.toHaveBeenCalled();
  });

  it("supports REVISION_REQUESTED as a status value", async () => {
    const { service, assetReviewRepository } = buildService();

    await service.review(
      "IMAGE",
      "image-1",
      { status: "REVISION_REQUESTED" },
      "reviewer-1",
      "user-1"
    );

    expect(assetReviewRepository.upsert).toHaveBeenCalledWith(
      "IMAGE",
      "image-1",
      "proj-1",
      expect.objectContaining({ status: "REVISION_REQUESTED" })
    );
  });
});

describe("AssetService.regenerate", () => {
  it("rejects PROMPT_TEMPLATE without calling any generation service", async () => {
    const { service, contentService, imageService } = buildService();

    await expect(
      service.regenerate("PROMPT_TEMPLATE", "prompt-1", "user-1")
    ).rejects.toThrow(AssetActionNotSupportedError);

    expect(contentService.generate).not.toHaveBeenCalled();
    expect(imageService.generate).not.toHaveBeenCalled();
  });

  it("regenerates an image, lazily backfilling version 1 for the source, then linking version 2", async () => {
    const { service, imageService, imageRepository, assetVersionRepository } = buildService();
    imageRepository.findById = vi
      .fn()
      .mockImplementation((id: string) => Promise.resolve(id === "image-1" ? imageRow : { ...imageRow, id: "image-2" }));

    const detail = await service.regenerate("IMAGE", "image-1", "user-1");

    expect(imageService.generate).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj-1", prompt: "A cat", provider: "fake" }),
      "user-1"
    );
    expect(assetVersionRepository.createFirstVersion).toHaveBeenCalledWith(
      "IMAGE",
      "image-1",
      "proj-1"
    );
    expect(assetVersionRepository.createNextVersion).toHaveBeenCalledWith(
      "IMAGE",
      "image-2",
      "proj-1",
      { id: "version-1", lineageId: "version-1", versionNumber: 1 }
    );
    expect(detail.id).toBe("image-2");
  });

  it("does not lazily create version 1 again when a version already exists", async () => {
    const { service, imageRepository, assetVersionRepository } = buildService({
      assetVersionRepository: {
        findOne: vi
          .fn()
          .mockResolvedValue({ id: "version-3", lineageId: "version-1", versionNumber: 3 }),
      },
    });
    imageRepository.findById = vi
      .fn()
      .mockImplementation((id: string) => Promise.resolve(id === "image-1" ? imageRow : { ...imageRow, id: "image-2" }));

    await service.regenerate("IMAGE", "image-1", "user-1");

    expect(assetVersionRepository.createFirstVersion).not.toHaveBeenCalled();
    expect(assetVersionRepository.createNextVersion).toHaveBeenCalledWith(
      "IMAGE",
      "image-2",
      "proj-1",
      { id: "version-3", lineageId: "version-1", versionNumber: 3 }
    );
  });

  it("rejects BRAND_KIT without calling any generation service", async () => {
    const { service, contentService, imageService } = buildService();

    await expect(
      service.regenerate("BRAND_KIT", "bk-1", "user-1")
    ).rejects.toThrow(AssetActionNotSupportedError);

    expect(contentService.generate).not.toHaveBeenCalled();
    expect(imageService.generate).not.toHaveBeenCalled();
  });

  it("regenerates content using the same type and prompt", async () => {
    const { service, contentService, contentRepository } = buildService();
    contentRepository.findById = vi
      .fn()
      .mockImplementation((id: string) => Promise.resolve(id === "content-1" ? contentRow : { ...contentRow, id: "content-2" }));

    await service.regenerate("BLOG", "content-1", "user-1");

    expect(contentService.generate).toHaveBeenCalledWith(
      { projectId: "proj-1", type: "BLOG", prompt: "Write about cats" },
      "user-1"
    );
  });

  it("regenerates a video asset (unlike BRAND_KIT/PROMPT_TEMPLATE, this is supported), reusing its kind/prompt/videoGroupId/brandKitId", async () => {
    const { service, videoAssetService, videoAssetRepository } = buildService();
    videoAssetRepository.findById = vi
      .fn()
      .mockImplementation((id: string) => Promise.resolve(id === "video-1" ? videoTextRow : { ...videoTextRow, id: "video-3" }));

    const detail = await service.regenerate("VIDEO", "video-1", "user-1");

    expect(videoAssetService.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        kind: "SCRIPT",
        prompt: "A launch video",
        videoGroupId: "group-1",
      }),
      "user-1"
    );
    expect(detail.id).toBe("video-3");
  });

  it("writes a VERSION_CREATED event on the new source id", async () => {
    const { service, imageRepository, assetReviewEventRepository } = buildService();
    imageRepository.findById = vi
      .fn()
      .mockImplementation((id: string) => Promise.resolve(id === "image-1" ? imageRow : { ...imageRow, id: "image-2" }));

    await service.regenerate("IMAGE", "image-1", "user-1");

    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        assetType: "IMAGE",
        sourceId: "image-2",
        type: "VERSION_CREATED",
        actorId: "user-1",
      })
    );
  });
});

describe("AssetService.duplicate", () => {
  it("does not create any version link", async () => {
    const { service, assetVersionRepository } = buildService();

    await service.duplicate("IMAGE", "image-1", "user-1");

    expect(assetVersionRepository.createFirstVersion).not.toHaveBeenCalled();
    expect(assetVersionRepository.createNextVersion).not.toHaveBeenCalled();
  });

  it("duplicates content via a direct row copy, without calling the generation service", async () => {
    const { service, contentRepository, contentService } = buildService();

    await service.duplicate("BLOG", "content-1", "user-1");

    expect(contentRepository.create).toHaveBeenCalledWith({
      projectId: "proj-1",
      type: "BLOG",
      prompt: "Write about cats",
      output: "Cats are great",
      model: "qwen2.5-coder:7b",
      createdBy: "user-1",
      generationTimeMs: 1200,
    });
    expect(contentService.generate).not.toHaveBeenCalled();
  });

  it("duplicates a prompt template via a direct row copy, appending (Copy) to its name", async () => {
    const { service, savedPromptRepository } = buildService();

    await service.duplicate("PROMPT_TEMPLATE", "prompt-1", "user-1");

    expect(savedPromptRepository.create).toHaveBeenCalledWith({
      userId: "user-1",
      projectId: "proj-1",
      name: "SEO Intro (Copy)",
      promptBody: "Write an SEO intro about {{topic}}",
      contentType: "BLOG",
    });
  });

  it("duplicates an image by regenerating from the same prompt/provider (no file-copy primitive exists)", async () => {
    const { service, imageService } = buildService();

    await service.duplicate("IMAGE", "image-1", "user-1");

    expect(imageService.generate).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj-1", prompt: "A cat", provider: "fake" }),
      "user-1"
    );
  });

  it("duplicates a brand kit via a direct row copy, appending (Copy) to its name", async () => {
    const { service, brandKitRepository } = buildService();

    await service.duplicate("BRAND_KIT", "bk-1", "user-1");

    expect(brandKitRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        createdBy: "user-1",
        name: "Acme Brand Kit (Copy)",
        toneOfVoice: "Confident and friendly",
        approvedTerminology: ["Acme"],
        restrictedWords: ["cheap"],
      })
    );
  });

  it("duplicates a text-kind video asset via a direct row copy, without calling the generation service", async () => {
    const { service, videoAssetRepository, videoAssetService } = buildService();

    await service.duplicate("VIDEO", "video-1", "user-1");

    expect(videoAssetRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        kind: "SCRIPT",
        prompt: "A launch video",
        output: "INT. LAUNCH PAD - DAY",
        status: "COMPLETED",
      })
    );
    expect(videoAssetService.generate).not.toHaveBeenCalled();
  });

  it("duplicates an image-kind video asset by regenerating (no file-copy primitive exists)", async () => {
    const { service, videoAssetRepository, videoAssetService } = buildService({
      videoAssetRepository: { findById: vi.fn().mockResolvedValue(videoImageRow) },
    });

    await service.duplicate("VIDEO", "video-2", "user-1");

    expect(videoAssetService.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        kind: "STORYBOARD",
        prompt: "A launch video",
        provider: "fake",
      }),
      "user-1"
    );
    expect(videoAssetRepository.create).not.toHaveBeenCalled();
  });
});

describe("AssetService.delete", () => {
  it("throws NotFoundError before deleting anything when the asset isn't owned", async () => {
    const { service, imageService, assetReviewRepository } = buildService({
      imageRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.delete("IMAGE", "image-1", "user-2")).rejects.toThrow(
      "Asset not found."
    );
    expect(imageService.delete).not.toHaveBeenCalled();
    expect(assetReviewRepository.deleteBySource).not.toHaveBeenCalled();
  });

  it("delegates to ImageService.delete for an IMAGE asset, then cleans up its review row", async () => {
    const { service, imageService, assetReviewRepository } = buildService();

    await service.delete("IMAGE", "image-1", "user-1");

    expect(imageService.delete).toHaveBeenCalledWith("image-1", "user-1");
    expect(assetReviewRepository.deleteBySource).toHaveBeenCalledWith("IMAGE", "image-1");
  });

  it("delegates to ContentService.delete for a content asset", async () => {
    const { service, contentService } = buildService();

    await service.delete("BLOG", "content-1", "user-1");

    expect(contentService.delete).toHaveBeenCalledWith("content-1", "user-1");
  });

  it("deletes a prompt template directly by id", async () => {
    const { service, savedPromptRepository } = buildService();

    await service.delete("PROMPT_TEMPLATE", "prompt-1", "user-1");

    expect(savedPromptRepository.delete).toHaveBeenCalledWith("prompt-1");
  });

  it("deletes a brand kit directly by id", async () => {
    const { service, brandKitRepository } = buildService();

    await service.delete("BRAND_KIT", "bk-1", "user-1");

    expect(brandKitRepository.delete).toHaveBeenCalledWith("bk-1");
  });

  it("delegates to VideoAssetService.delete for a VIDEO asset", async () => {
    const { service, videoAssetService } = buildService();

    await service.delete("VIDEO", "video-1", "user-1");

    expect(videoAssetService.delete).toHaveBeenCalledWith("video-1", "user-1");
  });
});

describe("AssetService.listVersions", () => {
  it("returns a synthetic version 1 dated to the asset's own createdAt when never regenerated", async () => {
    const { service } = buildService();

    const versions = await service.listVersions("IMAGE", "image-1", "user-1");

    expect(versions).toEqual([
      {
        id: "image-1",
        sourceId: "image-1",
        versionNumber: 1,
        createdAt: imageRow.createdAt,
        provider: "fake",
        model: "fake-image-v1",
      },
    ]);
  });

  it("looks up each version's own source row for provider/model, since each version is a distinct row", async () => {
    const { service } = buildService();

    const versions = await service.listVersions("IMAGE", "image-1", "user-1");

    expect(versions[0]?.provider).toBe(imageRow.provider);
    expect(versions[0]?.model).toBe(imageRow.model);
  });

  it("reports the constant content provider name and the row's own model for a content asset", async () => {
    const { service } = buildService();

    const versions = await service.listVersions("BLOG", "content-1", "user-1");

    expect(versions[0]?.provider).toBe("ollama");
    expect(versions[0]?.model).toBe(contentRow.model);
  });

  it("returns the full lineage, oldest to newest, once versions exist", async () => {
    const { service, assetVersionRepository } = buildService({
      assetVersionRepository: {
        findOne: vi
          .fn()
          .mockResolvedValue({ id: "version-2", lineageId: "version-1", versionNumber: 2 }),
        findLineage: vi.fn().mockResolvedValue([
          { id: "version-1", sourceId: "image-0", versionNumber: 1, createdAt: new Date("2026-01-01") },
          { id: "version-2", sourceId: "image-1", versionNumber: 2, createdAt: new Date("2026-01-02") },
        ]),
      },
    });

    const versions = await service.listVersions("IMAGE", "image-1", "user-1");

    expect(assetVersionRepository.findLineage).toHaveBeenCalledWith("version-1");
    expect(versions.map((v) => v.versionNumber)).toEqual([1, 2]);
  });
});

describe("AssetService.batch", () => {
  it("continues past a single-item failure and reports per-item results", async () => {
    const { service, imageRepository } = buildService();
    imageRepository.findById = vi
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(id === "image-1" ? imageRow : null)
      );

    const results = await service.batch(
      {
        items: [
          { assetType: "IMAGE", sourceId: "image-1" },
          { assetType: "IMAGE", sourceId: "image-missing" },
        ],
        action: "approve",
      },
      "user-1"
    );

    expect(results).toEqual([
      { sourceId: "image-1", assetType: "IMAGE", success: true },
      {
        sourceId: "image-missing",
        assetType: "IMAGE",
        success: false,
        error: "Asset not found.",
      },
    ]);
  });

  it("maps 'reject' to a REJECTED status review", async () => {
    const { service, assetReviewRepository } = buildService();

    await service.batch(
      { items: [{ assetType: "IMAGE", sourceId: "image-1" }], action: "reject" },
      "user-1"
    );

    expect(assetReviewRepository.upsert).toHaveBeenCalledWith(
      "IMAGE",
      "image-1",
      "proj-1",
      expect.objectContaining({ status: "REJECTED" })
    );
  });

  it("deletes each item for a 'delete' batch action", async () => {
    const { service, imageService } = buildService();

    const results = await service.batch(
      { items: [{ assetType: "IMAGE", sourceId: "image-1" }], action: "delete" },
      "user-1"
    );

    expect(imageService.delete).toHaveBeenCalledWith("image-1", "user-1");
    expect(results).toEqual([{ sourceId: "image-1", assetType: "IMAGE", success: true }]);
  });
});

describe("AssetService.list — comment counts and assignee", () => {
  it("surfaces commentCount/openCommentCount/assignee from the batched fetches", async () => {
    const { service } = buildService({
      contentRepository: createContentRepository(),
      imageRepository: createImageRepository({ findMany: vi.fn().mockResolvedValue([]) }),
      savedPromptRepository: createSavedPromptRepository({
        findManyByProject: vi.fn().mockResolvedValue([]),
      }),
      assetCommentRepository: createAssetCommentRepository({
        findManyBySourceIds: vi.fn().mockResolvedValue([
          { assetType: "BLOG", sourceId: "content-1", resolvedAt: null },
          { assetType: "BLOG", sourceId: "content-1", resolvedAt: new Date() },
        ]),
      }),
      assetReviewAssignmentRepository: createAssetReviewAssignmentRepository({
        findManyBySourceIds: vi.fn().mockResolvedValue([
          {
            assetType: "BLOG",
            sourceId: "content-1",
            assignee: { id: "user-2", name: "Grace Hopper" },
          },
        ]),
      }),
    });

    const result = await service.list({ projectId: "proj-1" }, "user-1");

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        commentCount: 2,
        openCommentCount: 1,
        assignee: { id: "user-2", name: "Grace Hopper" },
      })
    );
  });

  it("defaults commentCount/openCommentCount to 0 and assignee to null when unset", async () => {
    const { service } = buildService({
      imageRepository: createImageRepository({ findMany: vi.fn().mockResolvedValue([]) }),
      savedPromptRepository: createSavedPromptRepository({
        findManyByProject: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await service.list({ projectId: "proj-1" }, "user-1");

    expect(result.items[0]).toEqual(
      expect.objectContaining({ commentCount: 0, openCommentCount: 0, assignee: null })
    );
  });
});

describe("AssetService.getDetail — comment counts and assignee", () => {
  it("surfaces commentCount/openCommentCount/assignee for a single asset", async () => {
    const { service } = buildService({
      assetCommentRepository: createAssetCommentRepository({
        findManyBySource: vi.fn().mockResolvedValue([
          { resolvedAt: null },
          { resolvedAt: null },
          { resolvedAt: new Date() },
        ]),
      }),
      assetReviewAssignmentRepository: createAssetReviewAssignmentRepository({
        findOne: vi
          .fn()
          .mockResolvedValue({ assignee: { id: "user-2", name: "Grace Hopper" } }),
      }),
    });

    const detail = await service.getDetail("IMAGE", "image-1", "user-1");

    expect(detail.commentCount).toBe(3);
    expect(detail.openCommentCount).toBe(2);
    expect(detail.assignee).toEqual({ id: "user-2", name: "Grace Hopper" });
  });
});

const commentRow = {
  id: "comment-1",
  projectId: "proj-1",
  assetType: "IMAGE" as const,
  sourceId: "image-1",
  authorId: "user-1",
  body: "Looks great",
  isInternal: false,
  regionX: null,
  regionY: null,
  regionWidth: null,
  regionHeight: null,
  timestampMs: null,
  resolvedAt: null,
  resolvedBy: null,
  createdAt: new Date("2026-01-10T00:00:00.000Z"),
  updatedAt: new Date("2026-01-10T00:00:00.000Z"),
};

describe("AssetService.addComment", () => {
  it("throws NotFoundError when the asset doesn't exist or isn't owned by the caller", async () => {
    const { service } = buildService({
      imageRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.addComment("IMAGE", "image-1", { body: "hi" }, "user-1", "user-1")
    ).rejects.toThrow("Asset not found.");
  });

  it("creates a general comment and writes a COMMENT_ADDED event", async () => {
    const { service, assetCommentRepository, assetReviewEventRepository } = buildService({
      assetCommentRepository: createAssetCommentRepository({
        create: vi.fn().mockResolvedValue(commentRow),
      }),
    });

    const dto = await service.addComment(
      "IMAGE",
      "image-1",
      { body: "Looks great" },
      "user-1",
      "user-1"
    );

    expect(assetCommentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        assetType: "IMAGE",
        sourceId: "image-1",
        authorId: "user-1",
        body: "Looks great",
        isInternal: false,
      })
    );
    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "COMMENT_ADDED", actorId: "user-1" })
    );
    expect(dto).toEqual(
      expect.objectContaining({ body: "Looks great", authorName: "Ada Lovelace", region: null })
    );
  });

  it("creates a region annotation and writes an ANNOTATION_ADDED event", async () => {
    const { service, assetCommentRepository, assetReviewEventRepository } = buildService({
      assetCommentRepository: createAssetCommentRepository({
        create: vi.fn().mockResolvedValue({
          ...commentRow,
          regionX: 0.1,
          regionY: 0.2,
          regionWidth: 0.3,
          regionHeight: 0.4,
        }),
      }),
    });

    const dto = await service.addComment(
      "IMAGE",
      "image-1",
      { body: "Fix this spot", region: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 } },
      "user-1",
      "user-1"
    );

    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ANNOTATION_ADDED" })
    );
    expect(dto.region).toEqual({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 });
  });

  it("creates a timestamp annotation and writes an ANNOTATION_ADDED event", async () => {
    const { service, assetReviewEventRepository } = buildService({
      assetCommentRepository: createAssetCommentRepository({
        create: vi.fn().mockResolvedValue({ ...commentRow, timestampMs: 4200 }),
      }),
    });

    const dto = await service.addComment(
      "VIDEO",
      "video-1",
      { body: "Fix the pacing here", timestampMs: 4200 },
      "user-1",
      "user-1"
    );

    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ANNOTATION_ADDED" })
    );
    expect(dto.timestampMs).toBe(4200);
  });
});

describe("AssetService.listComments", () => {
  it("throws NotFoundError when the asset doesn't exist or isn't owned by the caller", async () => {
    const { service } = buildService({
      imageRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.listComments("IMAGE", "image-1", "user-1")).rejects.toThrow(
      "Asset not found."
    );
  });

  it("lists comments with author names resolved", async () => {
    const { service } = buildService({
      assetCommentRepository: createAssetCommentRepository({
        findManyBySource: vi.fn().mockResolvedValue([commentRow]),
      }),
    });

    const comments = await service.listComments("IMAGE", "image-1", "user-1");

    expect(comments).toEqual([
      expect.objectContaining({ id: "comment-1", authorName: "Ada Lovelace" }),
    ]);
  });
});

describe("AssetService.resolveComment", () => {
  it("throws NotFoundError when the comment doesn't belong to this asset", async () => {
    const { service } = buildService({
      assetCommentRepository: createAssetCommentRepository({
        findById: vi.fn().mockResolvedValue({ ...commentRow, sourceId: "image-other" }),
      }),
    });

    await expect(
      service.resolveComment("IMAGE", "image-1", "comment-1", "user-1")
    ).rejects.toThrow("Comment not found.");
  });

  it("resolves a comment and writes a COMMENT_RESOLVED event", async () => {
    const { service, assetCommentRepository, assetReviewEventRepository } = buildService({
      assetCommentRepository: createAssetCommentRepository({
        findById: vi.fn().mockResolvedValue(commentRow),
        resolve: vi
          .fn()
          .mockResolvedValue({ ...commentRow, resolvedAt: new Date(), resolvedBy: "user-1" }),
      }),
    });

    const dto = await service.resolveComment("IMAGE", "image-1", "comment-1", "user-1");

    expect(assetCommentRepository.resolve).toHaveBeenCalledWith("comment-1", "user-1");
    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "COMMENT_RESOLVED", actorId: "user-1" })
    );
    expect(dto.resolvedBy).toBe("user-1");
  });
});

describe("AssetService.deleteComment", () => {
  it("throws NotFoundError when the comment doesn't belong to this asset", async () => {
    const { service } = buildService({
      assetCommentRepository: createAssetCommentRepository({
        findById: vi.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      service.deleteComment("IMAGE", "image-1", "comment-1", "user-1")
    ).rejects.toThrow("Comment not found.");
  });

  it("deletes a comment belonging to the asset", async () => {
    const { service, assetCommentRepository } = buildService({
      assetCommentRepository: createAssetCommentRepository({
        findById: vi.fn().mockResolvedValue(commentRow),
      }),
    });

    await service.deleteComment("IMAGE", "image-1", "comment-1", "user-1");

    expect(assetCommentRepository.delete).toHaveBeenCalledWith("comment-1");
  });
});

describe("AssetService.assignReviewer", () => {
  it("throws NotFoundError when the assignee doesn't exist", async () => {
    const { service } = buildService({
      userRepository: createUserRepository({ findById: vi.fn().mockResolvedValue(null) }),
    });

    await expect(
      service.assignReviewer("IMAGE", "image-1", { assigneeId: "ghost" }, "user-1", "user-1")
    ).rejects.toThrow("Assignee not found.");
  });

  it("upserts the assignment, informational only, and writes an ASSIGNED event", async () => {
    const { service, assetReviewAssignmentRepository, assetReviewEventRepository } = buildService({
      assetReviewAssignmentRepository: createAssetReviewAssignmentRepository({
        findOne: vi.fn().mockResolvedValue({
          id: "assignment-1",
          assetType: "IMAGE",
          sourceId: "image-1",
          assigneeId: "user-2",
          assignedById: "user-1",
          note: "please check colors",
          createdAt: new Date("2026-01-10T00:00:00.000Z"),
          assignee: { id: "user-2", name: "Grace Hopper" },
        }),
      }),
      userRepository: createUserRepository({
        findById: vi
          .fn()
          .mockImplementation((id: string) =>
            Promise.resolve(
              id === "user-2"
                ? { id: "user-2", name: "Grace Hopper" }
                : { id: "user-1", name: "Ada Lovelace" }
            )
          ),
      }),
    });

    const dto = await service.assignReviewer(
      "IMAGE",
      "image-1",
      { assigneeId: "user-2", note: "please check colors" },
      "user-1",
      "user-1"
    );

    expect(assetReviewAssignmentRepository.upsert).toHaveBeenCalledWith(
      "IMAGE",
      "image-1",
      "proj-1",
      { assigneeId: "user-2", assignedById: "user-1", note: "please check colors" }
    );
    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ASSIGNED", actorId: "user-1" })
    );
    expect(dto).toEqual(
      expect.objectContaining({ assigneeName: "Grace Hopper", assignedByName: "Ada Lovelace" })
    );
  });
});

describe("AssetService.unassignReviewer", () => {
  it("deletes the assignment and writes an UNASSIGNED event", async () => {
    const { service, assetReviewAssignmentRepository, assetReviewEventRepository } =
      buildService();

    await service.unassignReviewer("IMAGE", "image-1", "user-1");

    expect(assetReviewAssignmentRepository.delete).toHaveBeenCalledWith("IMAGE", "image-1");
    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "UNASSIGNED", actorId: "user-1" })
    );
  });
});

describe("AssetService.getTimeline", () => {
  it("throws NotFoundError when the asset doesn't exist or isn't owned by the caller", async () => {
    const { service } = buildService({
      imageRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getTimeline("IMAGE", "image-1", "user-1")).rejects.toThrow(
      "Asset not found."
    );
  });

  it("maps events to DTOs, oldest-to-newest as returned by the repository", async () => {
    const { service } = buildService({
      assetReviewEventRepository: createAssetReviewEventRepository({
        findManyBySource: vi.fn().mockResolvedValue([
          {
            id: "event-1",
            type: "STATUS_CHANGED",
            actorId: "user-1",
            actor: { id: "user-1", name: "Ada Lovelace" },
            fromStatus: "NEEDS_REVIEW",
            toStatus: "APPROVED",
            metadata: null,
            createdAt: new Date("2026-01-10T00:00:00.000Z"),
          },
        ]),
      }),
    });

    const events = await service.getTimeline("IMAGE", "image-1", "user-1");

    expect(events).toEqual([
      {
        id: "event-1",
        type: "STATUS_CHANGED",
        actorId: "user-1",
        actorName: "Ada Lovelace",
        fromStatus: "NEEDS_REVIEW",
        toStatus: "APPROVED",
        metadata: null,
        createdAt: new Date("2026-01-10T00:00:00.000Z"),
      },
    ]);
  });
});

// --- Sprint 6.4 (Publishing Pipeline) ---------------------------------------
// Independent of QA review — gated on AssetReview.status === "APPROVED" but
// otherwise decoupled. See ADR-0010.

describe("AssetService.schedulePublish", () => {
  it("throws AssetNotApprovedError when the asset isn't approved", async () => {
    const { service } = buildService();

    await expect(
      service.schedulePublish("IMAGE", "image-1", { platform: "fake" }, "user-1")
    ).rejects.toThrow(
      "This asset must be approved (ReviewStatus.APPROVED) before it can be scheduled or published."
    );
  });

  it("upserts a DRAFT record and writes no event when no scheduledFor is given", async () => {
    const { service, publishingRecordRepository, assetReviewEventRepository } = buildService({
      assetReviewRepository: createAssetReviewRepository({
        findOne: vi.fn().mockResolvedValue({ status: "APPROVED" }),
      }),
    });

    await service.schedulePublish("IMAGE", "image-1", { platform: "fake" }, "user-1");

    expect(publishingRecordRepository.upsert).toHaveBeenCalledWith(
      "IMAGE",
      "image-1",
      "proj-1",
      "fake",
      { createdById: "user-1", status: "DRAFT", scheduledFor: null }
    );
    expect(assetReviewEventRepository.create).not.toHaveBeenCalled();
  });

  it("upserts a SCHEDULED record and writes a PUBLISH_SCHEDULED event when scheduledFor is given", async () => {
    const { service, publishingRecordRepository, assetReviewEventRepository } = buildService({
      assetReviewRepository: createAssetReviewRepository({
        findOne: vi.fn().mockResolvedValue({ status: "APPROVED" }),
      }),
    });

    const scheduledFor = "2026-08-01T00:00:00.000Z";

    await service.schedulePublish(
      "IMAGE",
      "image-1",
      { platform: "fake", scheduledFor },
      "user-1"
    );

    expect(publishingRecordRepository.upsert).toHaveBeenCalledWith(
      "IMAGE",
      "image-1",
      "proj-1",
      "fake",
      { createdById: "user-1", status: "SCHEDULED", scheduledFor: new Date(scheduledFor) }
    );
    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PUBLISH_SCHEDULED", actorId: "user-1" })
    );
  });
});

describe("AssetService.publish", () => {
  it("throws AssetNotApprovedError when the asset isn't approved", async () => {
    const { service } = buildService();

    await expect(service.publish("IMAGE", "image-1", "fake", "user-1")).rejects.toThrow(
      "This asset must be approved (ReviewStatus.APPROVED) before it can be scheduled or published."
    );
  });

  it("publishes successfully via the platform provider and records PUBLISHED", async () => {
    const publishMock = vi.fn().mockResolvedValue({
      externalId: "fake-image-image-1",
      externalUrl: "https://fake-platform.example.com/posts/image-image-1",
    });

    const { service, publishingRecordRepository, assetReviewEventRepository, platformProviderFactory } =
      buildService({
        assetReviewRepository: createAssetReviewRepository({
          findOne: vi.fn().mockResolvedValue({ status: "APPROVED" }),
        }),
        platformProviderFactory: createPlatformProviderFactory({
          create: vi.fn().mockReturnValue({ name: "fake", publish: publishMock }),
        }),
      });

    const record = await service.publish("IMAGE", "image-1", "fake", "user-1");

    expect(platformProviderFactory.create).toHaveBeenCalledWith("fake");
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj-1", assetType: "IMAGE", sourceId: "image-1" })
    );
    expect(publishingRecordRepository.update).toHaveBeenCalledWith(
      "pub-1",
      expect.objectContaining({ status: "PUBLISHING" })
    );
    expect(publishingRecordRepository.update).toHaveBeenCalledWith(
      "pub-1",
      expect.objectContaining({
        status: "PUBLISHED",
        externalId: "fake-image-image-1",
        externalUrl: "https://fake-platform.example.com/posts/image-image-1",
      })
    );
    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PUBLISH_STARTED" })
    );
    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PUBLISHED" })
    );
    expect(record.status).toBe("PUBLISHED");
  });

  it("marks the record FAILED, increments attempts, and throws PublishingFailedError when the provider fails", async () => {
    const { service, publishingRecordRepository, assetReviewEventRepository } = buildService({
      assetReviewRepository: createAssetReviewRepository({
        findOne: vi.fn().mockResolvedValue({ status: "APPROVED" }),
      }),
      platformProviderFactory: createPlatformProviderFactory({
        create: vi.fn().mockReturnValue({
          name: "fake",
          publish: vi.fn().mockRejectedValue(new Error("platform rejected the post")),
        }),
      }),
    });

    await expect(service.publish("IMAGE", "image-1", "fake", "user-1")).rejects.toThrow(
      "Publishing failed. Please try again, or try a different platform."
    );

    expect(publishingRecordRepository.update).toHaveBeenCalledWith(
      "pub-1",
      expect.objectContaining({
        status: "FAILED",
        errorMessage: "platform rejected the post",
        attempts: 1,
      })
    );
    expect(assetReviewEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PUBLISH_FAILED" })
    );
  });
});

describe("AssetService.retryPublish", () => {
  it("throws PublishingRecordNotFoundError when no record exists", async () => {
    const { service } = buildService();

    await expect(service.retryPublish("IMAGE", "image-1", "fake", "user-1")).rejects.toThrow(
      "No publishing record exists for this asset and platform."
    );
  });

  it("throws PublishingRetryNotAllowedError when the record isn't FAILED", async () => {
    const { service } = buildService({
      publishingRecordRepository: createPublishingRecordRepository({
        findOne: vi.fn().mockResolvedValue({ id: "pub-1", status: "PUBLISHED" }),
      }),
    });

    await expect(service.retryPublish("IMAGE", "image-1", "fake", "user-1")).rejects.toThrow(
      "Only a failed publishing record can be retried."
    );
  });

  it("re-runs publish() when the record is FAILED", async () => {
    const { service, platformProviderFactory } = buildService({
      assetReviewRepository: createAssetReviewRepository({
        findOne: vi.fn().mockResolvedValue({ status: "APPROVED" }),
      }),
      publishingRecordRepository: createPublishingRecordRepository({
        findOne: vi.fn().mockResolvedValue({ id: "pub-1", status: "FAILED", attempts: 1 }),
      }),
    });

    const record = await service.retryPublish("IMAGE", "image-1", "fake", "user-1");

    expect(platformProviderFactory.create).toHaveBeenCalledWith("fake");
    expect(record.status).toBe("PUBLISHED");
  });
});

describe("AssetService.archivePublish", () => {
  it("throws PublishingRecordNotFoundError when no record exists", async () => {
    const { service } = buildService();

    await expect(service.archivePublish("IMAGE", "image-1", "fake", "user-1")).rejects.toThrow(
      "No publishing record exists for this asset and platform."
    );
  });

  it("sets status ARCHIVED and writes no timeline event", async () => {
    const { service, publishingRecordRepository, assetReviewEventRepository } = buildService({
      publishingRecordRepository: createPublishingRecordRepository({
        findOne: vi.fn().mockResolvedValue({ id: "pub-1", status: "PUBLISHED" }),
      }),
    });

    const record = await service.archivePublish("IMAGE", "image-1", "fake", "user-1");

    expect(publishingRecordRepository.update).toHaveBeenCalledWith("pub-1", {
      status: "ARCHIVED",
    });
    expect(record.status).toBe("ARCHIVED");
    expect(assetReviewEventRepository.create).not.toHaveBeenCalled();
  });
});

describe("AssetService.list — publishing summary and filter", () => {
  it("surfaces publishing records per asset and filters by publishingStatus", async () => {
    const { service } = buildService({
      publishingRecordRepository: createPublishingRecordRepository({
        findManyBySourceIds: vi.fn().mockResolvedValue([
          { assetType: "IMAGE", sourceId: "image-1", platform: "fake", status: "PUBLISHED" },
        ]),
      }),
    });

    const all = await service.list({ projectId: "proj-1" }, "user-1");
    const imageItem = all.items.find((item) => item.id === "image-1");
    expect(imageItem?.publishing).toEqual([{ platform: "fake", status: "PUBLISHED" }]);

    const filtered = await service.list(
      { projectId: "proj-1", publishingStatus: "PUBLISHED" },
      "user-1"
    );
    expect(filtered.items.map((item) => item.id)).toEqual(["image-1"]);
  });
});

describe("AssetService.getDetail — publishing summary", () => {
  it("surfaces publishing records for the single asset", async () => {
    const { service } = buildService({
      publishingRecordRepository: createPublishingRecordRepository({
        findManyBySource: vi.fn().mockResolvedValue([
          { assetType: "IMAGE", sourceId: "image-1", platform: "fake", status: "SCHEDULED" },
        ]),
      }),
    });

    const detail = await service.getDetail("IMAGE", "image-1", "user-1");

    expect(detail.publishing).toEqual([{ platform: "fake", status: "SCHEDULED" }]);
  });
});
