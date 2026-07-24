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

interface Deps {
  contentRepository?: Partial<Record<string, unknown>>;
  imageRepository?: Partial<Record<string, unknown>>;
  savedPromptRepository?: Partial<Record<string, unknown>>;
  assetReviewRepository?: Partial<Record<string, unknown>>;
  assetVersionRepository?: Partial<Record<string, unknown>>;
  projectRepository?: Partial<Record<string, unknown>>;
  contentService?: Partial<Record<string, unknown>>;
  imageService?: Partial<Record<string, unknown>>;
}

function buildService(deps: Deps = {}) {
  const contentRepository = createContentRepository(deps.contentRepository);
  const imageRepository = createImageRepository(deps.imageRepository);
  const savedPromptRepository = createSavedPromptRepository(deps.savedPromptRepository);
  const assetReviewRepository = createAssetReviewRepository(deps.assetReviewRepository);
  const assetVersionRepository = createAssetVersionRepository(deps.assetVersionRepository);
  const projectRepository = createProjectRepository(deps.projectRepository);
  const contentService = createContentService(deps.contentService);
  const imageService = createImageService(deps.imageService);

  const service = new AssetService(
    contentRepository as never,
    imageRepository as never,
    savedPromptRepository as never,
    assetReviewRepository as never,
    assetVersionRepository as never,
    projectRepository as never,
    contentService as never,
    imageService as never
  );

  return {
    service,
    contentRepository,
    imageRepository,
    savedPromptRepository,
    assetReviewRepository,
    assetVersionRepository,
    projectRepository,
    contentService,
    imageService,
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
