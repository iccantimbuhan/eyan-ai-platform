import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    imageProvider: "fake-default",
    storageLocalRoot: "/test-storage-root",
    storagePublicBaseUrl: "/uploads/images",
  },
}));

import { env } from "../config/env.js";
import { ImageService } from "./image.service.js";
import {
  ImageGenerationError,
  ImageProviderNotConfiguredError,
} from "../errors/image-provider.error.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "image-1", projectId: "proj-1" }),
    update: vi.fn().mockResolvedValue({ id: "image-1", status: "COMPLETED" }),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findById: vi
      .fn()
      .mockResolvedValue({ id: "image-1", projectId: "proj-1", storagePath: null }),
    delete: vi.fn().mockResolvedValue({ id: "image-1" }),
    ...overrides,
  };
}

function createProjectRepository(
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "proj-1", userId: "user-1" }),
    ...overrides,
  };
}

function createImageProviderFactory(
  overrides: Partial<Record<string, unknown>> = {}
) {
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

function createStorageProvider(
  overrides: Partial<Record<string, unknown>> = {}
) {
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

describe("ImageService", () => {
  beforeEach(() => {
    (env as { imageProvider: string }).imageProvider = "fake-default";
  });

  describe("generate()", () => {
    it("throws NotFoundError when the project doesn't exist or isn't owned by the caller, without calling any provider", async () => {
      const repository = createRepository();
      const projectRepository = createProjectRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      const imageProviderFactory = createImageProviderFactory();
      const service = new ImageService(
        repository as never,
        projectRepository as never,
        imageProviderFactory as never,
        createStorageProvider() as never
      );

      await expect(
        service.generate({ projectId: "proj-1", prompt: "A cat" }, "user-2")
      ).rejects.toThrow("Project not found.");

      expect(imageProviderFactory.create).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("creates a PENDING row, then orchestrates provider -> storage -> COMPLETED update on success", async () => {
      const repository = createRepository();
      const projectRepository = createProjectRepository();
      const imageProviderFactory = createImageProviderFactory();
      const storageProvider = createStorageProvider();
      const service = new ImageService(
        repository as never,
        projectRepository as never,
        imageProviderFactory as never,
        storageProvider as never
      );

      const result = await service.generate(
        { projectId: "proj-1", prompt: "A cat", width: 256, height: 256, format: "png" },
        "user-1"
      );

      expect(repository.create).toHaveBeenCalledWith({
        projectId: "proj-1",
        prompt: "A cat",
        negativePrompt: null,
        provider: "fake",
        width: 256,
        height: 256,
        format: "PNG",
      });

      const provider = imageProviderFactory.create.mock.results[0].value;
      expect(provider.generate).toHaveBeenCalledWith({
        prompt: "A cat",
        negativePrompt: undefined,
        width: 256,
        height: 256,
        format: "png",
      });

      expect(storageProvider.save).toHaveBeenCalledWith({
        buffer: expect.any(Buffer),
        projectId: "proj-1",
        extension: "png",
      });

      expect(repository.update).toHaveBeenCalledWith("image-1", {
        status: "COMPLETED",
        model: "fake-image-v1",
        storagePath: "proj-1/uuid.png",
      });

      expect(result).toEqual({ id: "image-1", status: "COMPLETED" });
    });

    it("applies default width/height/format when not provided", async () => {
      const repository = createRepository();
      const imageProviderFactory = createImageProviderFactory();
      const service = new ImageService(
        repository as never,
        createProjectRepository() as never,
        imageProviderFactory as never,
        createStorageProvider() as never
      );

      await service.generate({ projectId: "proj-1", prompt: "A cat" }, "user-1");

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ width: 512, height: 512, format: "PNG" })
      );
    });

    it("marks the row FAILED and throws ImageGenerationError when the provider fails", async () => {
      const repository = createRepository();
      const imageProviderFactory = createImageProviderFactory({
        create: vi.fn().mockReturnValue({
          name: "fake",
          generate: vi.fn().mockRejectedValue(new Error("provider exploded")),
        }),
      });
      const storageProvider = createStorageProvider();
      const service = new ImageService(
        repository as never,
        createProjectRepository() as never,
        imageProviderFactory as never,
        storageProvider as never
      );

      await expect(
        service.generate({ projectId: "proj-1", prompt: "A cat" }, "user-1")
      ).rejects.toThrow(ImageGenerationError);

      expect(storageProvider.save).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith("image-1", {
        status: "FAILED",
        errorMessage: "provider exploded",
      });
    });

    it("marks the row FAILED and throws ImageGenerationError when storage fails", async () => {
      const repository = createRepository();
      const imageProviderFactory = createImageProviderFactory();
      const storageProvider = createStorageProvider({
        save: vi.fn().mockRejectedValue(new Error("disk full")),
      });
      const service = new ImageService(
        repository as never,
        createProjectRepository() as never,
        imageProviderFactory as never,
        storageProvider as never
      );

      await expect(
        service.generate({ projectId: "proj-1", prompt: "A cat" }, "user-1")
      ).rejects.toThrow(ImageGenerationError);

      expect(repository.update).toHaveBeenCalledWith("image-1", {
        status: "FAILED",
        errorMessage: "disk full",
      });
    });

    it("still throws ImageGenerationError (with the original message) even if persisting the FAILED status also fails", async () => {
      const repository = createRepository({
        update: vi.fn().mockRejectedValue(new Error("db unavailable")),
      });
      const imageProviderFactory = createImageProviderFactory({
        create: vi.fn().mockReturnValue({
          name: "fake",
          generate: vi.fn().mockRejectedValue(new Error("provider exploded")),
        }),
      });
      const service = new ImageService(
        repository as never,
        createProjectRepository() as never,
        imageProviderFactory as never,
        createStorageProvider() as never
      );

      await expect(
        service.generate({ projectId: "proj-1", prompt: "A cat" }, "user-1")
      ).rejects.toThrow("provider exploded");
    });

    it("does NOT re-mark the row FAILED if generation succeeds but the final COMPLETED update fails — propagates the raw DB error instead", async () => {
      const dbError = new Error("db unavailable");
      const repository = createRepository({
        update: vi.fn().mockRejectedValue(dbError),
      });
      const imageProviderFactory = createImageProviderFactory();
      const storageProvider = createStorageProvider();
      const service = new ImageService(
        repository as never,
        createProjectRepository() as never,
        imageProviderFactory as never,
        storageProvider as never
      );

      await expect(
        service.generate({ projectId: "proj-1", prompt: "A cat" }, "user-1")
      ).rejects.toBe(dbError);

      expect(repository.update).toHaveBeenCalledTimes(1);
      expect(repository.update).toHaveBeenCalledWith("image-1", {
        status: "COMPLETED",
        model: "fake-image-v1",
        storagePath: "proj-1/uuid.png",
      });
    });

    describe("provider selection", () => {
      it("uses the explicit per-request provider when given, even if a default is configured", async () => {
        const imageProviderFactory = createImageProviderFactory();
        const service = new ImageService(
          createRepository() as never,
          createProjectRepository() as never,
          imageProviderFactory as never,
          createStorageProvider() as never
        );

        await service.generate(
          { projectId: "proj-1", prompt: "A cat", provider: "explicit-provider" },
          "user-1"
        );

        expect(imageProviderFactory.create).toHaveBeenCalledWith(
          "explicit-provider"
        );
      });

      it("falls back to the configured default provider when the request doesn't specify one", async () => {
        const imageProviderFactory = createImageProviderFactory();
        const service = new ImageService(
          createRepository() as never,
          createProjectRepository() as never,
          imageProviderFactory as never,
          createStorageProvider() as never
        );

        await service.generate({ projectId: "proj-1", prompt: "A cat" }, "user-1");

        expect(imageProviderFactory.create).toHaveBeenCalledWith(
          "fake-default"
        );
      });

      it("throws ImageProviderNotConfiguredError when neither a request provider nor a default is set", async () => {
        (env as { imageProvider: string }).imageProvider = "";

        const imageProviderFactory = createImageProviderFactory();
        const repository = createRepository();
        const service = new ImageService(
          repository as never,
          createProjectRepository() as never,
          imageProviderFactory as never,
          createStorageProvider() as never
        );

        await expect(
          service.generate({ projectId: "proj-1", prompt: "A cat" }, "user-1")
        ).rejects.toThrow(ImageProviderNotConfiguredError);

        expect(imageProviderFactory.create).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
      });
    });
  });

  it("list() throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new ImageService(
      repository as never,
      projectRepository as never
    );

    await expect(
      service.list({ projectId: "proj-1" }, "user-2")
    ).rejects.toThrow("Project not found.");

    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it("list() scopes both findMany and count to the requesting userId once ownership is verified", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository();
    const service = new ImageService(
      repository as never,
      projectRepository as never
    );

    await service.list({ projectId: "proj-1" }, "user-1");

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj-1", userId: "user-1" })
    );
    expect(repository.count).toHaveBeenCalledWith("proj-1", "user-1");
  });

  it("getById() throws NotFoundError when the image doesn't exist or isn't owned by the caller", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new ImageService(
      repository as never,
      createProjectRepository() as never
    );

    await expect(service.getById("image-1", "user-2")).rejects.toThrow(
      "Generated image not found."
    );
  });

  describe("delete()", () => {
    it("verifies ownership before deleting", async () => {
      const repository = createRepository({
        findById: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      });
      const service = new ImageService(
        repository as never,
        createProjectRepository() as never
      );

      await expect(service.delete("image-1", "user-2")).rejects.toThrow(
        "Generated image not found."
      );

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("removes the row once ownership is verified, and skips storage cleanup when there's no stored file", async () => {
      const repository = createRepository({
        findById: vi
          .fn()
          .mockResolvedValue({ id: "image-1", projectId: "proj-1", storagePath: null }),
      });
      const storageProvider = createStorageProvider();
      const service = new ImageService(
        repository as never,
        createProjectRepository() as never,
        createImageProviderFactory() as never,
        storageProvider as never
      );

      await service.delete("image-1", "user-1");

      expect(storageProvider.delete).not.toHaveBeenCalled();
      expect(repository.delete).toHaveBeenCalledWith("image-1");
    });

    it("deletes the stored file when storagePath is set", async () => {
      const repository = createRepository({
        findById: vi.fn().mockResolvedValue({
          id: "image-1",
          projectId: "proj-1",
          storagePath: "proj-1/uuid.png",
        }),
      });
      const storageProvider = createStorageProvider();
      const service = new ImageService(
        repository as never,
        createProjectRepository() as never,
        createImageProviderFactory() as never,
        storageProvider as never
      );

      await service.delete("image-1", "user-1");

      expect(storageProvider.delete).toHaveBeenCalledWith("proj-1/uuid.png");
      expect(repository.delete).toHaveBeenCalledWith("image-1");
    });

    it("still deletes the metadata row even if storage cleanup fails", async () => {
      const repository = createRepository({
        findById: vi.fn().mockResolvedValue({
          id: "image-1",
          projectId: "proj-1",
          storagePath: "proj-1/uuid.png",
        }),
      });
      const storageProvider = createStorageProvider({
        delete: vi.fn().mockRejectedValue(new Error("permission denied")),
      });
      const service = new ImageService(
        repository as never,
        createProjectRepository() as never,
        createImageProviderFactory() as never,
        storageProvider as never
      );

      await expect(service.delete("image-1", "user-1")).resolves.toEqual({
        id: "image-1",
      });

      expect(repository.delete).toHaveBeenCalledWith("image-1");
    });
  });
});
