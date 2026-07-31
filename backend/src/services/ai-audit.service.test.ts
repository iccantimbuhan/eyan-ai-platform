import { describe, expect, it, vi } from "vitest";

import { AiAuditService } from "./ai-audit.service.js";
import { AI_CORE_CACHE_INVALIDATE, aiCoreCacheEvents } from "./ai-cache-invalidation.events.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "evt-1" }),
    findByTarget: vi.fn().mockResolvedValue([]),
    findRecent: vi.fn().mockResolvedValue([]),
    countByTarget: vi.fn().mockResolvedValue(0),
    count: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe("AiAuditService", () => {
  it("record() writes straight through to the repository", async () => {
    const repository = createRepository();
    const service = new AiAuditService(repository as never);

    await service.record({ actorId: "user-1", action: "BRAIN_CREATED", targetType: "AiBrain", targetId: "brain-1" });

    expect(repository.create).toHaveBeenCalledWith({
      actorId: "user-1",
      action: "BRAIN_CREATED",
      targetType: "AiBrain",
      targetId: "brain-1",
    });
  });

  it("record() emits AI_CORE_CACHE_INVALIDATE for a cache-invalidating action", async () => {
    const repository = createRepository();
    const service = new AiAuditService(repository as never);
    const listener = vi.fn();
    aiCoreCacheEvents.once(AI_CORE_CACHE_INVALIDATE, listener);

    await service.record({ actorId: "user-1", action: "ROUTING_POLICY_CHANGED", targetType: "AiRoutingPolicy", targetId: "policy-1" });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ROUTING_POLICY_CHANGED", targetId: "policy-1" })
    );
  });

  it("record() does not emit AI_CORE_CACHE_INVALIDATE for a non-invalidating action", async () => {
    const repository = createRepository();
    const service = new AiAuditService(repository as never);
    const listener = vi.fn();
    aiCoreCacheEvents.once(AI_CORE_CACHE_INVALIDATE, listener);

    await service.record({ actorId: "user-1", action: "PROVIDER_CREDENTIAL_ACCESSED", targetType: "AiProviderCredential", targetId: "cred-1" });
    // Prove the listener genuinely wasn't fired for this action (not just
    // timing) by firing a real invalidating event afterward and checking
    // the listener only saw that second one.
    await service.record({ actorId: "user-1", action: "BRAIN_UPDATED", targetType: "AiBrain", targetId: "brain-1" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ action: "BRAIN_UPDATED" }));
  });

  it("listRecent() paginates and counts", async () => {
    const repository = createRepository({
      findRecent: vi.fn().mockResolvedValue([{ id: "evt-1" }]),
      count: vi.fn().mockResolvedValue(1),
    });
    const service = new AiAuditService(repository as never);

    const result = await service.listRecent(1, 10);

    expect(repository.findRecent).toHaveBeenCalledWith({ skip: 0, take: 10 });
    expect(result).toEqual({ data: [{ id: "evt-1" }], total: 1, page: 1, pageSize: 10 });
  });

  it("clamps pageSize above the maximum down to 100", async () => {
    const repository = createRepository();
    const service = new AiAuditService(repository as never);

    await service.listRecent(1, 500);

    expect(repository.findRecent).toHaveBeenCalledWith({ skip: 0, take: 100 });
  });
});
