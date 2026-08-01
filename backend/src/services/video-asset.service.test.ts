import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    imageProvider: "fake-default",
    storageLocalRoot: "/test-storage-root",
    storagePublicBaseUrl: "/uploads/images",
  },
}));

import { env } from "../config/env.js";
import { VideoAssetService } from "./video-asset.service.js";
import { logger } from "../lib/logger.js";
import { ApiError } from "../errors/api-error.js";
import {
  ImageGenerationError,
  ImageProviderNotConfiguredError,
} from "../errors/image-provider.error.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "video-1", projectId: "proj-1" }),
    update: vi.fn().mockResolvedValue({ id: "video-1", status: "COMPLETED" }),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findById: vi
      .fn()
      .mockResolvedValue({ id: "video-1", projectId: "proj-1", storagePath: null }),
    delete: vi.fn().mockResolvedValue({ id: "video-1" }),
    ...overrides,
  };
}

function createProjectRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "proj-1", userId: "user-1" }),
    ...overrides,
  };
}

function createBrandKitRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function createCapabilityService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    invoke: vi.fn().mockResolvedValue({
      output: "INT. LAUNCH PAD - DAY",
      model: "qwen2.5",
      provider: "ollama",
      outcome: "VALID",
    }),
    ...overrides,
  };
}

function createImageProviderFactory(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockReturnValue({
      name: "fake",
      generate: vi.fn().mockResolvedValue({
        buffer: Buffer.from("fake-bytes"),
        model: "fake-image-v1",
        width: 512,
        height: 512,
        format: "png",
      }),
    }),
    ...overrides,
  };
}

function createStorageProvider(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    save: vi.fn().mockResolvedValue({
      path: "proj-1/uuid.png",
      url: "/uploads/images/proj-1/uuid.png",
      bytes: 10,
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    getUrl: vi.fn().mockReturnValue("/uploads/images/proj-1/uuid.png"),
    ...overrides,
  };
}

function createAnalyticsEventRepository(
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    create: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function buildService(
  overrides: {
    repository?: Partial<Record<string, unknown>>;
    projectRepository?: Partial<Record<string, unknown>>;
    brandKitRepository?: Partial<Record<string, unknown>>;
    capabilityService?: Partial<Record<string, unknown>>;
    imageProviderFactory?: Partial<Record<string, unknown>>;
    storageProvider?: Partial<Record<string, unknown>>;
    analyticsEventRepository?: Partial<Record<string, unknown>>;
  } = {}
) {
  const repository = createRepository(overrides.repository);
  const projectRepository = createProjectRepository(overrides.projectRepository);
  const brandKitRepository = createBrandKitRepository(overrides.brandKitRepository);
  const capabilityService = createCapabilityService(overrides.capabilityService);
  const imageProviderFactory = createImageProviderFactory(overrides.imageProviderFactory);
  const storageProvider = createStorageProvider(overrides.storageProvider);
  const analyticsEventRepository = createAnalyticsEventRepository(
    overrides.analyticsEventRepository
  );

  const service = new VideoAssetService(
    repository as never,
    projectRepository as never,
    brandKitRepository as never,
    capabilityService as never,
    imageProviderFactory as never,
    storageProvider as never,
    analyticsEventRepository as never
  );

  return {
    service,
    repository,
    projectRepository,
    brandKitRepository,
    capabilityService,
    imageProviderFactory,
    storageProvider,
    analyticsEventRepository,
  };
}

describe("VideoAssetService", () => {
  beforeEach(() => {
    (env as { imageProvider: string }).imageProvider = "fake-default";
  });

  describe("generate() — text kinds", () => {
    it("throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
      const { service, capabilityService, repository } = buildService({
        projectRepository: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        service.generate({ projectId: "proj-1", kind: "SCRIPT", prompt: "A launch video" }, "user-2")
      ).rejects.toThrow("Project not found.");

      expect(capabilityService.invoke).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("invokes the video-script Capability (AI Core, no legacy provider registry) and persists a COMPLETED row with a fresh videoGroupId", async () => {
      const { service, repository, capabilityService } = buildService();

      await service.generate(
        { projectId: "proj-1", kind: "SCRIPT", prompt: "A launch video" },
        "user-1"
      );

      expect(capabilityService.invoke).toHaveBeenCalledWith(
        "video-script",
        { prompt: "A launch video", brandGuidance: "" },
        { expectJson: false },
        "user-1"
      );
      expect(repository.create).toHaveBeenCalledWith({
        projectId: "proj-1",
        brandKitId: null,
        videoGroupId: expect.any(String),
        kind: "SCRIPT",
        prompt: "A launch video",
        output: "INT. LAUNCH PAD - DAY",
        model: "qwen2.5",
        status: "COMPLETED",
        generationTimeMs: expect.any(Number),
        createdBy: "user-1",
      });
    });

    it("resolves the Capability key for each TextVideoAssetKind", async () => {
      const { service, capabilityService } = buildService();

      await service.generate(
        { projectId: "proj-1", kind: "SCENE_BREAKDOWN", prompt: "A launch video" },
        "user-1"
      );

      expect(capabilityService.invoke).toHaveBeenCalledWith(
        "video-scene-breakdown",
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it("reuses the given videoGroupId when provided, instead of generating a new one", async () => {
      const { service, repository } = buildService();

      await service.generate(
        {
          projectId: "proj-1",
          kind: "SCENE_BREAKDOWN",
          prompt: "A launch video",
          videoGroupId: "group-42",
        },
        "user-1"
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ videoGroupId: "group-42" })
      );
    });

    it("throws NotFoundError when brandKitId doesn't resolve to a kit owned by the caller", async () => {
      const { service, capabilityService } = buildService({
        brandKitRepository: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        service.generate(
          { projectId: "proj-1", kind: "SCRIPT", prompt: "A launch video", brandKitId: "bk-1" },
          "user-1"
        )
      ).rejects.toThrow("Brand kit not found.");

      expect(capabilityService.invoke).not.toHaveBeenCalled();
    });

    it("folds brand kit guidance into the invoke() input and persists brandKitId", async () => {
      const brandKit = {
        id: "bk-1",
        projectId: "proj-1",
        name: "Acme",
        toneOfVoice: "Bold and energetic",
        writingStyle: null,
        audience: null,
        ctaStyle: null,
        approvedTerminology: ["launch vehicle"],
        restrictedWords: [],
        brandGuidelines: null,
      };
      const { service, repository, capabilityService } = buildService({
        brandKitRepository: { findById: vi.fn().mockResolvedValue(brandKit) },
      });

      await service.generate(
        { projectId: "proj-1", kind: "SCRIPT", prompt: "A launch video", brandKitId: "bk-1" },
        "user-1"
      );

      const [, input] = capabilityService.invoke.mock.calls[0];
      expect(input.brandGuidance).toContain("Bold and energetic");
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ brandKitId: "bk-1" })
      );
    });

    it("throws a 503 ApiError when the routing engine doesn't produce a VALID outcome", async () => {
      const { service, repository, capabilityService } = buildService({
        capabilityService: {
          invoke: vi.fn().mockResolvedValue({
            output: "",
            model: "qwen2.5",
            provider: "ollama",
            outcome: "TRANSIENT_FAILURE",
          }),
        },
      });

      await expect(
        service.generate({ projectId: "proj-1", kind: "SCRIPT", prompt: "A launch video" }, "user-1")
      ).rejects.toThrow(ApiError);

      expect(capabilityService.invoke).toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe("generate() — image kinds (STORYBOARD/THUMBNAIL)", () => {
    it("creates a PENDING row, then orchestrates provider -> storage -> COMPLETED update on success", async () => {
      const { service, repository, imageProviderFactory, storageProvider } = buildService();

      const result = await service.generate(
        { projectId: "proj-1", kind: "STORYBOARD", prompt: "A rocket on the pad", width: 256, height: 256 },
        "user-1"
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "STORYBOARD",
          provider: "fake",
          width: 256,
          height: 256,
          format: "PNG",
          status: "PENDING",
        })
      );

      const provider = imageProviderFactory.create.mock.results[0].value;
      expect(provider.generate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: "A rocket on the pad", width: 256, height: 256 })
      );

      expect(storageProvider.save).toHaveBeenCalledWith({
        buffer: expect.any(Buffer),
        projectId: "proj-1",
        extension: "png",
      });

      expect(repository.update).toHaveBeenCalledWith("video-1", {
        status: "COMPLETED",
        model: "fake-image-v1",
        storagePath: "proj-1/uuid.png",
        generationTimeMs: expect.any(Number),
      });

      expect(result).toEqual({ id: "video-1", status: "COMPLETED" });
    });

    it("marks the row FAILED and throws ImageGenerationError when the provider fails", async () => {
      const { service, repository, storageProvider } = buildService({
        imageProviderFactory: {
          create: vi.fn().mockReturnValue({
            name: "fake",
            generate: vi.fn().mockRejectedValue(new Error("provider exploded")),
          }),
        },
      });

      await expect(
        service.generate({ projectId: "proj-1", kind: "THUMBNAIL", prompt: "A rocket" }, "user-1")
      ).rejects.toThrow(ImageGenerationError);

      expect(storageProvider.save).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith("video-1", {
        status: "FAILED",
        errorMessage: "provider exploded",
      });
    });

    it("never leaks the raw provider error message to the caller", async () => {
      const { service } = buildService({
        imageProviderFactory: {
          create: vi.fn().mockReturnValue({
            name: "fake",
            generate: vi.fn().mockRejectedValue(new Error("internal vendor detail")),
          }),
        },
      });

      await expect(
        service.generate({ projectId: "proj-1", kind: "STORYBOARD", prompt: "A rocket" }, "user-1")
      ).rejects.toThrow(
        "Video asset generation failed. Please try again, or try a different provider."
      );
    });

    it("folds imageStyle guidance into the provider prompt but keeps the stored prompt as the user's original", async () => {
      const brandKitRepository = createBrandKitRepository({
        findById: vi
          .fn()
          .mockResolvedValue({ id: "bk-1", projectId: "proj-1", name: "Acme", imageStyle: "High contrast, dramatic" }),
      });
      const { service, repository, imageProviderFactory } = buildService({ brandKitRepository });

      await service.generate(
        { projectId: "proj-1", kind: "STORYBOARD", prompt: "A rocket", brandKitId: "bk-1" },
        "user-1"
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ brandKitId: "bk-1", prompt: "A rocket" })
      );

      const provider = imageProviderFactory.create.mock.results[0].value;
      expect(provider.generate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: expect.stringContaining("High contrast, dramatic") })
      );
    });

    it("throws ImageProviderNotConfiguredError when neither a request provider nor a default is set", async () => {
      (env as { imageProvider: string }).imageProvider = "";

      const { service, repository, imageProviderFactory } = buildService();

      await expect(
        service.generate({ projectId: "proj-1", kind: "STORYBOARD", prompt: "A rocket" }, "user-1")
      ).rejects.toThrow(ImageProviderNotConfiguredError);

      expect(imageProviderFactory.create).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  // Sprint 6.5 (Analytics Foundation) — the analytics write is fire-and-
  // forget and must never interrupt generation, for both the text and
  // image kind paths. See ADR-0011.
  describe("generate() — analytics", () => {
    it("records a GENERATED analytics event for a text kind, provider is the content provider", async () => {
      const { service, analyticsEventRepository } = buildService();

      await service.generate(
        { projectId: "proj-1", kind: "SCRIPT", prompt: "A launch video" },
        "user-1"
      );

      expect(analyticsEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "proj-1",
          assetType: "VIDEO",
          sourceId: "video-1",
          type: "GENERATED",
          actorId: "user-1",
          provider: "ollama",
          model: "qwen2.5",
          generationTimeMs: expect.any(Number),
          brandKitId: null,
        })
      );
    });

    it("still returns the generated text-kind row successfully even when the analytics write rejects", async () => {
      const { service } = buildService({
        analyticsEventRepository: {
          create: vi.fn().mockRejectedValue(new Error("db unavailable")),
        },
      });

      const result = await service.generate(
        { projectId: "proj-1", kind: "SCRIPT", prompt: "A launch video" },
        "user-1"
      );

      expect(result).toEqual({ id: "video-1", projectId: "proj-1" });
    });

    it("records a GENERATED analytics event for an image kind, provider is the image provider", async () => {
      const { service, analyticsEventRepository } = buildService();

      await service.generate(
        { projectId: "proj-1", kind: "STORYBOARD", prompt: "A rocket" },
        "user-1"
      );

      expect(analyticsEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "proj-1",
          assetType: "VIDEO",
          sourceId: "video-1",
          type: "GENERATED",
          actorId: "user-1",
          provider: "fake",
          model: "fake-image-v1",
          generationTimeMs: expect.any(Number),
          brandKitId: null,
        })
      );
    });

    it("still returns the completed image-kind row successfully even when the analytics write rejects", async () => {
      const { service } = buildService({
        analyticsEventRepository: {
          create: vi.fn().mockRejectedValue(new Error("db unavailable")),
        },
      });

      const result = await service.generate(
        { projectId: "proj-1", kind: "STORYBOARD", prompt: "A rocket" },
        "user-1"
      );

      expect(result).toEqual({ id: "video-1", status: "COMPLETED" });
    });
  });

  describe("list()", () => {
    it("throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
      const { service, repository } = buildService({
        projectRepository: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(service.list({ projectId: "proj-1" }, "user-2")).rejects.toThrow(
        "Project not found."
      );
      expect(repository.findMany).not.toHaveBeenCalled();
    });

    it("scopes findMany/count to the requesting userId and forwards videoGroupId/kind filters", async () => {
      const { service, repository } = buildService();

      await service.list(
        { projectId: "proj-1", videoGroupId: "group-1", kind: "SCRIPT" },
        "user-1"
      );

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "proj-1",
          userId: "user-1",
          videoGroupId: "group-1",
          kind: "SCRIPT",
        })
      );
      expect(repository.count).toHaveBeenCalledWith("proj-1", "user-1", {
        videoGroupId: "group-1",
        kind: "SCRIPT",
      });
    });
  });

  describe("delete()", () => {
    it("verifies ownership before deleting", async () => {
      const { service, repository } = buildService({
        repository: { findById: vi.fn().mockResolvedValue(null), delete: vi.fn() },
      });

      await expect(service.delete("video-1", "user-2")).rejects.toThrow(
        "Video asset not found."
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("deletes the stored file when storagePath is set, and still deletes the row if cleanup fails", async () => {
      const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      const { service, repository, storageProvider } = buildService({
        repository: {
          findById: vi.fn().mockResolvedValue({
            id: "video-1",
            projectId: "proj-1",
            storagePath: "proj-1/uuid.png",
          }),
        },
        storageProvider: {
          delete: vi.fn().mockRejectedValue(new Error("permission denied")),
        },
      });

      await expect(service.delete("video-1", "user-1")).resolves.toEqual({ id: "video-1" });

      expect(storageProvider.delete).toHaveBeenCalledWith("proj-1/uuid.png");
      expect(repository.delete).toHaveBeenCalledWith("video-1");

      errorSpy.mockRestore();
    });
  });
});
