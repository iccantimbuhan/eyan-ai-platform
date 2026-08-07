import { describe, expect, it, vi } from "vitest";

import {
  SalesCategoryEntryService,
  SalesChannelEntryService,
  SalesItemEntryService,
  SalesPaymentMethodEntryService,
} from "./sales-entry.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { SalesEntryAlreadyExistsError, SalesScopeMismatchError } from "../errors/sales.error.js";

function recordRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "sales-1", branchId: "branch-1", restaurantId: "rest-1", ...overrides };
}

function recordRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { findById: vi.fn().mockResolvedValue(recordRow()), ...overrides };
}

describe("SalesChannelEntryService", () => {
  function channelRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findById: vi.fn().mockResolvedValue({ id: "channel-1", restaurantId: "rest-1", name: "Wolt" }),
      ...overrides,
    };
  }

  function posSourceRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findById: vi.fn().mockResolvedValue({ id: "pos-1", restaurantId: "rest-1", name: "POS 1" }),
      ...overrides,
    };
  }

  function entryRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findByRecordAndChannel: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "entry-1",
        salesChannelId: "channel-1",
        salesChannel: { name: "Wolt" },
        amount: { toFixed: () => "229.05" },
        createdAt: new Date(2026, 0, 1),
      }),
      findById: vi.fn().mockResolvedValue({ id: "entry-1", dailySalesRecordId: "sales-1" }),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it("create() rejects a channel that belongs to a different restaurant", async () => {
    const entries = entryRepository();
    const service = new SalesChannelEntryService(
      entries as never,
      recordRepository() as never,
      channelRepository({
        findById: vi.fn().mockResolvedValue({ id: "channel-1", restaurantId: "rest-OTHER" }),
      }) as never
    );

    await expect(service.create("sales-1", { salesChannelId: "channel-1", amount: 100 })).rejects.toThrow(
      SalesScopeMismatchError
    );
    expect(entries.create).not.toHaveBeenCalled();
  });

  it("create() rejects a duplicate channel entry on the same record", async () => {
    const entries = entryRepository({ findByRecordAndChannel: vi.fn().mockResolvedValue({ id: "existing" }) });
    const service = new SalesChannelEntryService(entries as never, recordRepository() as never, channelRepository() as never);

    await expect(service.create("sales-1", { salesChannelId: "channel-1", amount: 100 })).rejects.toThrow(
      SalesEntryAlreadyExistsError
    );
    expect(entries.create).not.toHaveBeenCalled();
  });

  it("create() passes posSourceId (or null when omitted) into the duplicate check", async () => {
    const entries = entryRepository();
    const service = new SalesChannelEntryService(
      entries as never,
      recordRepository() as never,
      channelRepository() as never,
      posSourceRepository() as never
    );

    await service.create("sales-1", { salesChannelId: "channel-1", amount: 100 });
    expect(entries.findByRecordAndChannel).toHaveBeenCalledWith("sales-1", "channel-1", null);

    await service.create("sales-1", { salesChannelId: "channel-1", amount: 100, posSourceId: "pos-1" });
    expect(entries.findByRecordAndChannel).toHaveBeenCalledWith("sales-1", "channel-1", "pos-1");
  });

  it("create() allows the same channel to be entered under a different POS source on the same day", async () => {
    // Mirrors the DB's NULL-safe duplicate scoping: only a matching
    // (channel, POS) pair is a real duplicate — POS 1 already has an
    // entry, POS 2 does not, so the same channel can still be split
    // across both terminals on the same business day.
    const findByRecordAndChannel = vi.fn((_recordId: string, _channelId: string, posSourceId: string | null) =>
      Promise.resolve(posSourceId === "pos-1" ? { id: "existing" } : null)
    );
    const entries = entryRepository({ findByRecordAndChannel });
    const service = new SalesChannelEntryService(
      entries as never,
      recordRepository() as never,
      channelRepository() as never,
      posSourceRepository() as never
    );

    await expect(
      service.create("sales-1", { salesChannelId: "channel-1", amount: 420.3, posSourceId: "pos-1" })
    ).rejects.toThrow(SalesEntryAlreadyExistsError);

    await expect(
      service.create("sales-1", { salesChannelId: "channel-1", amount: 486.49, posSourceId: "pos-2" })
    ).resolves.toBeDefined();
    expect(entries.create).toHaveBeenCalledWith(
      expect.objectContaining({ salesChannelId: "channel-1", posSourceId: "pos-2" })
    );
  });

  it("create() persists a valid entry", async () => {
    const entries = entryRepository();
    const service = new SalesChannelEntryService(entries as never, recordRepository() as never, channelRepository() as never);

    await service.create("sales-1", { salesChannelId: "channel-1", amount: 229.05 });

    expect(entries.create).toHaveBeenCalledWith({
      dailySalesRecordId: "sales-1",
      branchId: "branch-1",
      salesChannelId: "channel-1",
      posSourceId: null,
      amount: 229.05,
      transactionCount: null,
    });
  });

  it("create() persists posSourceId and transactionCount when provided", async () => {
    const entries = entryRepository();
    const service = new SalesChannelEntryService(
      entries as never,
      recordRepository() as never,
      channelRepository() as never,
      posSourceRepository() as never
    );

    await service.create("sales-1", { salesChannelId: "channel-1", amount: 229.05, posSourceId: "pos-1", transactionCount: 12 });

    expect(entries.create).toHaveBeenCalledWith({
      dailySalesRecordId: "sales-1",
      branchId: "branch-1",
      salesChannelId: "channel-1",
      posSourceId: "pos-1",
      amount: 229.05,
      transactionCount: 12,
    });
  });

  it("create() rejects a posSourceId that belongs to a different restaurant", async () => {
    const entries = entryRepository();
    const service = new SalesChannelEntryService(
      entries as never,
      recordRepository() as never,
      channelRepository() as never,
      posSourceRepository({
        findById: vi.fn().mockResolvedValue({ id: "pos-1", restaurantId: "rest-OTHER" }),
      }) as never
    );

    await expect(
      service.create("sales-1", { salesChannelId: "channel-1", amount: 100, posSourceId: "pos-1" })
    ).rejects.toThrow(SalesScopeMismatchError);
    expect(entries.create).not.toHaveBeenCalled();
  });

  it("delete() 404s when the entry does not belong to the given sales record", async () => {
    const entries = entryRepository({
      findById: vi.fn().mockResolvedValue({ id: "entry-1", dailySalesRecordId: "sales-OTHER" }),
    });
    const service = new SalesChannelEntryService(entries as never, recordRepository() as never, channelRepository() as never);

    await expect(service.delete("sales-1", "entry-1")).rejects.toThrow(NotFoundError);
    expect(entries.delete).not.toHaveBeenCalled();
  });

  it("delete() removes the entry when it belongs to the given sales record", async () => {
    const entries = entryRepository();
    const service = new SalesChannelEntryService(entries as never, recordRepository() as never, channelRepository() as never);

    await service.delete("sales-1", "entry-1");

    expect(entries.delete).toHaveBeenCalledWith("entry-1");
  });
});

describe("SalesPaymentMethodEntryService", () => {
  function paymentMethodRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findById: vi.fn().mockResolvedValue({ id: "method-1", restaurantId: "rest-1", name: "Electronic" }),
      ...overrides,
    };
  }

  function posSourceRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findById: vi.fn().mockResolvedValue({ id: "pos-1", restaurantId: "rest-1", name: "POS 1" }),
      ...overrides,
    };
  }

  function entryRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findByRecordAndMethod: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "entry-1",
        salesPaymentMethodId: "method-1",
        salesPaymentMethod: { name: "Electronic" },
        amount: { toFixed: () => "213.20" },
        transactionCount: 12,
        createdAt: new Date(2026, 0, 1),
      }),
      findById: vi.fn().mockResolvedValue({ id: "entry-1", dailySalesRecordId: "sales-1" }),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it("create() rejects a payment method from a different restaurant", async () => {
    const entries = entryRepository();
    const service = new SalesPaymentMethodEntryService(
      entries as never,
      recordRepository() as never,
      paymentMethodRepository({
        findById: vi.fn().mockResolvedValue({ id: "method-1", restaurantId: "rest-OTHER" }),
      }) as never
    );

    await expect(
      service.create("sales-1", { salesPaymentMethodId: "method-1", amount: 213.2 })
    ).rejects.toThrow(SalesScopeMismatchError);
  });

  it("create() persists a valid entry with an optional transaction count", async () => {
    const entries = entryRepository();
    const service = new SalesPaymentMethodEntryService(entries as never, recordRepository() as never, paymentMethodRepository() as never);

    await service.create("sales-1", { salesPaymentMethodId: "method-1", amount: 213.2, transactionCount: 12 });

    expect(entries.create).toHaveBeenCalledWith({
      dailySalesRecordId: "sales-1",
      branchId: "branch-1",
      salesPaymentMethodId: "method-1",
      posSourceId: null,
      amount: 213.2,
      transactionCount: 12,
    });
  });

  it("create() persists posSourceId when provided", async () => {
    const entries = entryRepository();
    const service = new SalesPaymentMethodEntryService(
      entries as never,
      recordRepository() as never,
      paymentMethodRepository() as never,
      posSourceRepository() as never
    );

    await service.create("sales-1", { salesPaymentMethodId: "method-1", amount: 213.2, posSourceId: "pos-1" });

    expect(entries.create).toHaveBeenCalledWith({
      dailySalesRecordId: "sales-1",
      branchId: "branch-1",
      salesPaymentMethodId: "method-1",
      posSourceId: "pos-1",
      amount: 213.2,
      transactionCount: null,
    });
  });

  it("create() rejects a posSourceId that belongs to a different restaurant", async () => {
    const entries = entryRepository();
    const service = new SalesPaymentMethodEntryService(
      entries as never,
      recordRepository() as never,
      paymentMethodRepository() as never,
      posSourceRepository({
        findById: vi.fn().mockResolvedValue({ id: "pos-1", restaurantId: "rest-OTHER" }),
      }) as never
    );

    await expect(
      service.create("sales-1", { salesPaymentMethodId: "method-1", amount: 100, posSourceId: "pos-1" })
    ).rejects.toThrow(SalesScopeMismatchError);
    expect(entries.create).not.toHaveBeenCalled();
  });

  it("create() rejects a duplicate (method, POS) pair but allows the same method under a different POS source on the same day", async () => {
    // Mirrors the DB's NULL-safe duplicate scoping — e.g. "Wolt" reported
    // as a payment method under both POS 1 and POS 2 on the same day.
    const findByRecordAndMethod = vi.fn((_recordId: string, _methodId: string, posSourceId: string | null) =>
      Promise.resolve(posSourceId === "pos-1" ? { id: "existing" } : null)
    );
    const entries = entryRepository({ findByRecordAndMethod });
    const service = new SalesPaymentMethodEntryService(
      entries as never,
      recordRepository() as never,
      paymentMethodRepository() as never,
      posSourceRepository() as never
    );

    await expect(
      service.create("sales-1", { salesPaymentMethodId: "method-1", amount: 100, posSourceId: "pos-1" })
    ).rejects.toThrow(SalesEntryAlreadyExistsError);

    await expect(
      service.create("sales-1", { salesPaymentMethodId: "method-1", amount: 150, posSourceId: "pos-2" })
    ).resolves.toBeDefined();
    expect(entries.create).toHaveBeenCalledWith(
      expect.objectContaining({ salesPaymentMethodId: "method-1", posSourceId: "pos-2" })
    );
  });

  it("create() rejects a duplicate entry when both are unassigned (posSourceId omitted twice)", async () => {
    const findByRecordAndMethod = vi.fn().mockResolvedValue({ id: "existing" });
    const entries = entryRepository({ findByRecordAndMethod });
    const service = new SalesPaymentMethodEntryService(entries as never, recordRepository() as never, paymentMethodRepository() as never);

    await expect(
      service.create("sales-1", { salesPaymentMethodId: "method-1", amount: 100 })
    ).rejects.toThrow(SalesEntryAlreadyExistsError);
    expect(findByRecordAndMethod).toHaveBeenCalledWith("sales-1", "method-1", null);
  });
});

describe("SalesCategoryEntryService", () => {
  function categoryRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findById: vi.fn().mockResolvedValue({ id: "category-1", restaurantId: "rest-1", name: "Pizza" }),
      ...overrides,
    };
  }

  function entryRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findByRecordAndCategory: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "entry-1",
        salesCategoryId: "category-1",
        salesCategory: { name: "Pizza" },
        quantity: null,
        amount: { toFixed: () => "500.00" },
        createdAt: new Date(2026, 0, 1),
      }),
      findById: vi.fn().mockResolvedValue({ id: "entry-1", dailySalesRecordId: "sales-1" }),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it("create() rejects a category from a different restaurant", async () => {
    const entries = entryRepository();
    const service = new SalesCategoryEntryService(
      entries as never,
      recordRepository() as never,
      categoryRepository({
        findById: vi.fn().mockResolvedValue({ id: "category-1", restaurantId: "rest-OTHER" }),
      }) as never
    );

    await expect(service.create("sales-1", { salesCategoryId: "category-1", amount: 500 })).rejects.toThrow(
      SalesScopeMismatchError
    );
  });

  it("create() persists a valid entry", async () => {
    const entries = entryRepository();
    const service = new SalesCategoryEntryService(entries as never, recordRepository() as never, categoryRepository() as never);

    await service.create("sales-1", { salesCategoryId: "category-1", amount: 500 });

    expect(entries.create).toHaveBeenCalledWith({
      dailySalesRecordId: "sales-1",
      branchId: "branch-1",
      salesCategoryId: "category-1",
      quantity: null,
      amount: 500,
    });
  });
});

describe("SalesItemEntryService", () => {
  function menuItemRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findById: vi.fn().mockResolvedValue({ id: "menu-item-1", restaurantId: "rest-1" }),
      ...overrides,
    };
  }

  function entryRepository(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      create: vi.fn().mockResolvedValue({
        id: "entry-1",
        menuItemId: null,
        itemName: "Margherita",
        categoryName: "Pizza",
        quantity: { toFixed: () => "3.00" },
        amount: { toFixed: () => "36.00" },
        createdAt: new Date(2026, 0, 1),
      }),
      findById: vi.fn().mockResolvedValue({ id: "entry-1", dailySalesRecordId: "sales-1" }),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it("create() allows an item entry with no menuItemId at all", async () => {
    const entries = entryRepository();
    const menuItems = menuItemRepository();
    const service = new SalesItemEntryService(entries as never, recordRepository() as never, menuItems as never);

    await service.create("sales-1", { itemName: "Margherita", categoryName: "Pizza", quantity: 3, amount: 36 });

    expect(menuItems.findById).not.toHaveBeenCalled();
    expect(entries.create).toHaveBeenCalledWith({
      dailySalesRecordId: "sales-1",
      branchId: "branch-1",
      menuItemId: null,
      itemName: "Margherita",
      categoryName: "Pizza",
      quantity: 3,
      amount: 36,
      posQuantityPercent: null,
      posSalesPercent: null,
    });
  });

  // The spec's own worked example: Margherita, 6 sold, €63.00, POS-reported
  // 33.33% of quantity and 29.90% of sales — transcribed manually, distinct
  // from Sprint 2D's own computed analytics percentages.
  it("create() passes POS % Qty and POS % Sales through to the repository when provided", async () => {
    const entries = entryRepository();
    const service = new SalesItemEntryService(entries as never, recordRepository() as never, menuItemRepository() as never);

    await service.create("sales-1", {
      itemName: "Margherita",
      quantity: 6,
      amount: 63.0,
      posQuantityPercent: 33.33,
      posSalesPercent: 29.9,
    });

    expect(entries.create).toHaveBeenCalledWith(
      expect.objectContaining({ posQuantityPercent: 33.33, posSalesPercent: 29.9 })
    );
  });

  it("create() defaults POS % Qty and POS % Sales to null when omitted", async () => {
    const entries = entryRepository();
    const service = new SalesItemEntryService(entries as never, recordRepository() as never, menuItemRepository() as never);

    await service.create("sales-1", { itemName: "Margherita", quantity: 6, amount: 63.0 });

    expect(entries.create).toHaveBeenCalledWith(
      expect.objectContaining({ posQuantityPercent: null, posSalesPercent: null })
    );
  });

  // A pre-existing SalesItemEntry row from before this field existed has no
  // posQuantityPercent/posSalesPercent key at all — the mapper must still
  // return a valid, non-crashing response (null, not a thrown error).
  it("maps a historical entry with no POS percentage data to null, not a crash", async () => {
    const entries = entryRepository();
    const service = new SalesItemEntryService(entries as never, recordRepository() as never, menuItemRepository() as never);

    const result = await service.create("sales-1", { itemName: "Margherita", quantity: 3, amount: 36 });

    expect(result.posQuantityPercent).toBeNull();
    expect(result.posSalesPercent).toBeNull();
  });

  it("create() rejects a menuItemId belonging to a different restaurant", async () => {
    const entries = entryRepository();
    const service = new SalesItemEntryService(
      entries as never,
      recordRepository() as never,
      menuItemRepository({
        findById: vi.fn().mockResolvedValue({ id: "menu-item-1", restaurantId: "rest-OTHER" }),
      }) as never
    );

    await expect(
      service.create("sales-1", { menuItemId: "menu-item-1", itemName: "Margherita", quantity: 3, amount: 36 })
    ).rejects.toThrow(SalesScopeMismatchError);
    expect(entries.create).not.toHaveBeenCalled();
  });

  it("delete() 404s when the entry does not belong to the given sales record", async () => {
    const entries = entryRepository({
      findById: vi.fn().mockResolvedValue({ id: "entry-1", dailySalesRecordId: "sales-OTHER" }),
    });
    const service = new SalesItemEntryService(entries as never, recordRepository() as never, menuItemRepository() as never);

    await expect(service.delete("sales-1", "entry-1")).rejects.toThrow(NotFoundError);
  });
});
