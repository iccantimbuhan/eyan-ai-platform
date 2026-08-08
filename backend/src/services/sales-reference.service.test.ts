import { describe, expect, it, vi } from "vitest";

import {
  PosSourceService,
  SalesCategoryService,
  SalesChannelService,
  SalesPaymentMethodService,
} from "./sales-reference.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { SalesReferenceAlreadyExistsError, SalesScopeMismatchError } from "../errors/sales.error.js";

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
  ["PosSourceService", PosSourceService],
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

// SalesPaymentMethod is the only reference list with a mutable field beyond
// name (ADR-0043) — its own create()/update() behavior, on top of the
// shared list/create/duplicate-name suite above.
describe("SalesPaymentMethodService — cash classification (ADR-0043)", () => {
  function paymentMethodRow(overrides: Partial<Record<string, unknown>> = {}) {
    return { ...referenceRow(), isCashEquivalent: false, ...overrides };
  }

  function createPaymentMethodRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findManyByRestaurantId: vi.fn().mockResolvedValue([paymentMethodRow()]),
      findByRestaurantIdAndName: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(paymentMethodRow()),
      create: vi.fn().mockResolvedValue(paymentMethodRow()),
      update: vi.fn().mockResolvedValue(paymentMethodRow({ isCashEquivalent: true })),
      ...overrides,
    };
  }

  it("create() persists isCashEquivalent when the caller explicitly sets it", async () => {
    const repository = createPaymentMethodRepository();
    const service = new SalesPaymentMethodService(repository as never);

    await service.create("rest-1", { name: "Cash Draw", isCashEquivalent: true });

    expect(repository.create).toHaveBeenCalledWith({
      restaurantId: "rest-1",
      name: "Cash Draw",
      isCashEquivalent: true,
    });
  });

  it("update() flags an existing payment method as physical cash", async () => {
    const repository = createPaymentMethodRepository({
      findById: vi.fn().mockResolvedValue(paymentMethodRow({ id: "pm-1", restaurantId: "rest-1" })),
    });
    const service = new SalesPaymentMethodService(repository as never);

    const result = await service.update("rest-1", "pm-1", { isCashEquivalent: true });

    expect(repository.update).toHaveBeenCalledWith("pm-1", { isCashEquivalent: true });
    expect(result.isCashEquivalent).toBe(true);
  });

  it("update() throws NotFoundError when the payment method doesn't exist", async () => {
    const repository = createPaymentMethodRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new SalesPaymentMethodService(repository as never);

    await expect(service.update("rest-1", "missing", { isCashEquivalent: true })).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  // Restaurant scope protection — the id in the URL must actually belong to
  // the :restaurantId in the URL, mirroring sales-entry.service.ts's own
  // cross-restaurant FK checks.
  it("update() throws SalesScopeMismatchError when the payment method belongs to a different restaurant", async () => {
    const repository = createPaymentMethodRepository({
      findById: vi.fn().mockResolvedValue(paymentMethodRow({ id: "pm-1", restaurantId: "other-rest" })),
    });
    const service = new SalesPaymentMethodService(repository as never);

    await expect(service.update("rest-1", "pm-1", { isCashEquivalent: true })).rejects.toThrow(
      SalesScopeMismatchError
    );
    expect(repository.update).not.toHaveBeenCalled();
  });
});
