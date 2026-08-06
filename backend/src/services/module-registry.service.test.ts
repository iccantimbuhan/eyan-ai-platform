import { describe, expect, it, vi } from "vitest";

import { ModuleRegistryService } from "./module-registry.service.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findEnabledByOrganizationIds: vi.fn().mockResolvedValue([]),
    upsert: vi.fn(),
    ...overrides,
  };
}

describe("ModuleRegistryService", () => {
  it("groups enabled module keys by organizationId", async () => {
    const repository = createRepository({
      findEnabledByOrganizationIds: vi.fn().mockResolvedValue([
        { organizationId: "org-a", moduleKey: "restaurant" },
        { organizationId: "org-a", moduleKey: "finance" },
        { organizationId: "org-b", moduleKey: "crm" },
      ]),
    });
    const service = new ModuleRegistryService(repository as never);

    const result = await service.enabledModuleKeysByOrganization(["org-a", "org-b"]);

    expect(result.get("org-a")).toEqual(["restaurant", "finance"]);
    expect(result.get("org-b")).toEqual(["crm"]);
  });

  it("returns an empty map when no module is enabled for any given Organization", async () => {
    const repository = createRepository();
    const service = new ModuleRegistryService(repository as never);

    const result = await service.enabledModuleKeysByOrganization(["org-a"]);

    expect(result.size).toBe(0);
  });

  it("setEnabled() delegates straight to the repository's upsert", async () => {
    const repository = createRepository();
    const service = new ModuleRegistryService(repository as never);

    await service.setEnabled("org-a", "restaurant", true);

    expect(repository.upsert).toHaveBeenCalledWith({
      organizationId: "org-a",
      moduleKey: "restaurant",
      enabled: true,
    });
  });
});
