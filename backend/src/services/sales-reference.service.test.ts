import { describe, expect, it, vi } from "vitest";

import { SalesCategoryService, SalesChannelService, SalesPaymentMethodService } from "./sales-reference.service.js";
import { SalesReferenceAlreadyExistsError } from "../errors/sales.error.js";

function referenceRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ref-1",
    restaurantId: "rest-1",
    name: "Wolt",
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByRestaurantId: vi.fn().mockResolvedValue([referenceRow()]),
    findByRestaurantIdAndName: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(referenceRow()),
    ...overrides,
  };
}

// One shared test suite structure run against all three master-list
// services — they're identical in behavior, see sales-reference.service.ts's
// grouping rationale.
describe.each([
  ["SalesChannelService", SalesChannelService],
  ["SalesPaymentMethodService", SalesPaymentMethodService],
  ["SalesCategoryService", SalesCategoryService],
] as const)("%s", (_name, ServiceClass) => {
  it("list() delegates to the repository by restaurantId", async () => {
    const repository = createRepository();
    const service = new ServiceClass(repository as never);

    await service.list("rest-1");

    expect(repository.findManyByRestaurantId).toHaveBeenCalledWith("rest-1");
  });

  it("create() persists a new reference row", async () => {
    const repository = createRepository();
    const service = new ServiceClass(repository as never);

    await service.create("rest-1", { name: "Wolt" });

    expect(repository.create).toHaveBeenCalledWith({ restaurantId: "rest-1", name: "Wolt" });
  });

  it("create() throws SalesReferenceAlreadyExistsError for a duplicate name on the same restaurant", async () => {
    const repository = createRepository({ findByRestaurantIdAndName: vi.fn().mockResolvedValue(referenceRow()) });
    const service = new ServiceClass(repository as never);

    await expect(service.create("rest-1", { name: "Wolt" })).rejects.toThrow(SalesReferenceAlreadyExistsError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
