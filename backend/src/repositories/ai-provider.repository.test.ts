import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const findUniqueMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    aiProvider: {
      create: createMock,
      update: updateMock,
      delete: deleteMock,
      findUnique: findUniqueMock,
      findMany: findManyMock,
    },
  },
}));

const { AiProviderRepository } = await import("./ai-provider.repository.js");

describe("AiProviderRepository", () => {
  const repository = new AiProviderRepository();

  beforeEach(() => {
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    findUniqueMock.mockReset();
    findManyMock.mockReset();
  });

  it("creates a provider", async () => {
    createMock.mockResolvedValue({});

    await repository.create({ key: "ollama", displayName: "Ollama (local)", kind: "LOCAL", baseUrl: "http://127.0.0.1:11434" });

    expect(createMock).toHaveBeenCalledWith({
      data: { key: "ollama", displayName: "Ollama (local)", kind: "LOCAL", baseUrl: "http://127.0.0.1:11434" },
    });
  });

  it("finds a provider by its registry key", async () => {
    findUniqueMock.mockResolvedValue({ id: "provider-1", key: "ollama" });

    const result = await repository.findByKey("ollama");

    expect(findUniqueMock).toHaveBeenCalledWith({ where: { key: "ollama" } });
    expect(result).toEqual({ id: "provider-1", key: "ollama" });
  });

  it("filters to enabled providers only", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findEnabled();

    expect(findManyMock).toHaveBeenCalledWith({ where: { isEnabled: true }, orderBy: { createdAt: "desc" } });
  });

  it("updateHealthStatus() sets healthStatus/lastHealthMessage/lastHealthCheckAt together", async () => {
    updateMock.mockResolvedValue({});
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:00:00Z"));

    await repository.updateHealthStatus("provider-1", "HEALTHY", null);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "provider-1" },
      data: { healthStatus: "HEALTHY", lastHealthMessage: null, lastHealthCheckAt: new Date("2026-07-31T12:00:00Z") },
    });
    vi.useRealTimers();
  });

  it("deletes a provider by id", async () => {
    deleteMock.mockResolvedValue({});

    await repository.delete("provider-1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "provider-1" } });
  });
});
