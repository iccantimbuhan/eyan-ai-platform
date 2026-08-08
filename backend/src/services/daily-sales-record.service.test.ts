import { describe, expect, it, vi } from "vitest";

import { DailySalesRecordService, truncateToUtcDate } from "./daily-sales-record.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import {
  DailySalesRecordAlreadyExistsError,
  InvalidCashDiscountError,
  SalesScopeMismatchError,
} from "../errors/sales.error.js";
import { Prisma } from "../generated/prisma/client.js";

function recordRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sales-1",
    branchId: "branch-1",
    restaurantId: "rest-1",
    businessDate: new Date("2026-08-03T00:00:00.000Z"),
    source: "POS_REPORT",
    posReportType: "Z_REPORT",
    posReportNumber: "851",
    posReportedTotal: new Prisma.Decimal("1226.55"),
    totalSales: new Prisma.Decimal("1226.55"),
    discountsTotal: new Prisma.Decimal("0.00"),
    vouchersAmount: new Prisma.Decimal("0.00"),
    vouchersCount: null,
    actualCashCounted: null,
    discountPosSourceId: null,
    discountPosSource: null,
    cashDiscountTotal: null,
    notes: null,
    channelEntries: [],
    paymentMethodEntries: [],
    categoryEntries: [],
    itemEntries: [],
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(recordRow()),
    findByBranchAndDate: vi.fn().mockResolvedValue(null),
    findManyByBranchId: vi.fn().mockResolvedValue([recordRow()]),
    create: vi.fn().mockResolvedValue(recordRow()),
    update: vi.fn().mockResolvedValue(recordRow({ totalSales: new Prisma.Decimal("1300.00") })),
    ...overrides,
  };
}

function createBranchRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { findById: vi.fn().mockResolvedValue({ id: "branch-1", restaurantId: "rest-1" }), ...overrides };
}

// Only used by discountPosSourceId scope-validation tests — mirrors
// PosSourceRepository's shape (sales-reference.repository.ts).
function createPosSourceRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "pos-1", restaurantId: "rest-1", name: "POS 1" }),
    ...overrides,
  };
}

function buildService(overrides: {
  repository?: Partial<Record<string, unknown>>;
  branchRepository?: Partial<Record<string, unknown>>;
  posSourceRepository?: Partial<Record<string, unknown>>;
} = {}) {
  return new DailySalesRecordService(
    createRepository(overrides.repository) as never,
    createBranchRepository(overrides.branchRepository) as never,
    createPosSourceRepository(overrides.posSourceRepository) as never
  );
}

// Shared by every describe block below that builds SalesPaymentMethodEntry
// row fixtures.
function paymentMethodEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "pme-1",
    salesPaymentMethodId: "cash-draw-id",
    salesPaymentMethod: { name: "Cash Draw", isCashEquivalent: true },
    posSourceId: "pos-1",
    posSource: { name: "POS 1" },
    amount: new Prisma.Decimal("466.70"),
    transactionCount: null,
    createdAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

describe("truncateToUtcDate", () => {
  it("truncates any time-of-day to UTC midnight", () => {
    expect(truncateToUtcDate("2026-08-03T15:42:00.000Z").toISOString()).toBe(
      "2026-08-03T00:00:00.000Z"
    );
    expect(truncateToUtcDate(new Date("2026-08-03")).toISOString()).toBe("2026-08-03T00:00:00.000Z");
  });
});

describe("DailySalesRecordService", () => {
  it("create() persists a header record scoped to the branch's restaurant", async () => {
    const repository = createRepository();
    const service = buildService({ repository });

    await service.create(
      "branch-1",
      { businessDate: "2026-08-03", source: "POS_REPORT", totalSales: 1226.55 },
      "user-1"
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: "branch-1",
        restaurantId: "rest-1",
        totalSales: 1226.55,
        createdById: "user-1",
      })
    );
  });

  it("create() throws NotFoundError when the branch doesn't exist", async () => {
    const service = buildService({ branchRepository: { findById: vi.fn().mockResolvedValue(null) } });

    await expect(
      service.create("missing-branch", { businessDate: "2026-08-03", source: "MANUAL", totalSales: 100 }, "user-1")
    ).rejects.toThrow(NotFoundError);
  });

  // ADR-0039 Decision 1: one POS register-closing per branch per day.
  it("create() throws DailySalesRecordAlreadyExistsError for a duplicate branch+businessDate", async () => {
    const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(recordRow()) });
    const service = buildService({ repository });

    await expect(
      service.create("branch-1", { businessDate: "2026-08-03", source: "MANUAL", totalSales: 100 }, "user-1")
    ).rejects.toThrow(DailySalesRecordAlreadyExistsError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("getById() throws NotFoundError when the record doesn't exist", async () => {
    const service = buildService({ repository: { findById: vi.fn().mockResolvedValue(null) } });

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("getDaily() throws NotFoundError when no record exists for that branch+date", async () => {
    const service = buildService();

    await expect(service.getDaily("branch-1", "2026-08-03")).rejects.toThrow(NotFoundError);
  });

  it("getDaily() returns the mapped record when one exists", async () => {
    const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(recordRow()) });
    const service = buildService({ repository });

    const result = await service.getDaily("branch-1", "2026-08-03");

    expect(result.id).toBe("sales-1");
    expect(result.totalSales).toBe("1226.55");
  });

  it("update() 404s before updating when the record doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = buildService({ repository });

    await expect(service.update("missing", { totalSales: 100 })).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("update() persists header field changes", async () => {
    const repository = createRepository();
    const service = buildService({ repository });

    await service.update("sales-1", { totalSales: 1300 });

    expect(repository.update).toHaveBeenCalledWith(
      "sales-1",
      expect.objectContaining({ totalSales: 1300 })
    );
  });

  describe("reconciliation on a single record — the spec's own worked example, never adjusted", () => {
    it("surfaces the variance between totalSales and channel entries without changing either", async () => {
      const row = recordRow({
        totalSales: new Prisma.Decimal("1226.55"),
        posReportedTotal: new Prisma.Decimal("1226.55"),
        channelEntries: [
          { salesChannelId: "wolt-id", salesChannel: { name: "Wolt" }, amount: new Prisma.Decimal("229.05") },
          { salesChannelId: "bolt-id", salesChannel: { name: "Bolt" }, amount: new Prisma.Decimal("152.25") },
          { salesChannelId: "mypos-id", salesChannel: { name: "MyPOS" }, amount: new Prisma.Decimal("213.20") },
          { salesChannelId: "cash-id", salesChannel: { name: "Cash" }, amount: new Prisma.Decimal("264.15") },
        ],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.reconciliation.channelEntriesTotal).toBe("858.65");
      expect(result.reconciliation.varianceVsChannelEntriesTotal).toBe("367.90");
      expect(result.reconciliation.varianceVsPosReportedTotal).toBe("0.00");
      expect(result.totalSales).toBe("1226.55");
    });

    it("returns a null POS variance for a MANUAL record with no POS report", async () => {
      const row = recordRow({ posReportedTotal: null });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.reconciliation.posReportedTotal).toBeNull();
      expect(result.reconciliation.posReportedRecordCount).toBe(0);
      expect(result.reconciliation.varianceVsPosReportedTotal).toBeNull();
    });
  });

  describe("cash reconciliation on a single record (ADR-0043) — never touches totalSales", () => {
    // Cash Draw (POS 1) €466.70 + Bolt Cash (POS 2) €599.60 are physical
    // cash; Trust/Card Payment (POS 1) €264.50 is not (isCashEquivalent:
    // false) and must be excluded from physicalCashBasis even though it's
    // on the same POS source as a cash method — the exact mistake spec §10
    // warns against ("do not simply say Physical Cash = €80 because €30
    // was paid electronically").
    it("aggregates physical cash across multiple POS sources and excludes card/electronic entirely", async () => {
      const row = recordRow({
        discountsTotal: new Prisma.Decimal("2.35"),
        actualCashCounted: new Prisma.Decimal("1328.45"),
        paymentMethodEntries: [
          paymentMethodEntry({
            id: "pme-1",
            salesPaymentMethodId: "cash-draw-id",
            salesPaymentMethod: { name: "Cash Draw", isCashEquivalent: true },
            posSourceId: "pos-1",
            posSource: { name: "POS 1" },
            amount: new Prisma.Decimal("466.70"),
          }),
          paymentMethodEntry({
            id: "pme-2",
            salesPaymentMethodId: "trust-card-id",
            salesPaymentMethod: { name: "Trust/Card Payment", isCashEquivalent: false },
            posSourceId: "pos-1",
            posSource: { name: "POS 1" },
            amount: new Prisma.Decimal("264.50"),
          }),
          paymentMethodEntry({
            id: "pme-3",
            salesPaymentMethodId: "bolt-cash-id",
            salesPaymentMethod: { name: "Bolt Cash", isCashEquivalent: true },
            posSourceId: "pos-2",
            posSource: { name: "POS 2" },
            amount: new Prisma.Decimal("599.60"),
          }),
        ],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.physicalCashBasis).toBe("1066.30");
      expect(result.cashReconciliation.cardElectronicTotal).toBe("264.50");
      expect(result.cashReconciliation.totalPaymentMethods).toBe("1330.80");
      expect(result.cashReconciliation.manualDiscounts).toBe("2.35");
      expect(result.cashReconciliation.expectedCash).toBe("1063.95");
      expect(result.cashReconciliation.actualCashCounted).toBe("1328.45");
      // Actual cash counted (€1,328.45) reflects ALL cash across both POS
      // sources, matching the spec's own combined worked example.
      expect(result.cashReconciliation.discrepancy).toBe("264.50");
      expect(result.cashReconciliation.status).toBe("OVER");
      // totalSales is never touched by any of the above.
      expect(result.totalSales).toBe("1226.55");
    });

    it("is BALANCED when actual cash counted exactly matches expected cash", async () => {
      const row = recordRow({
        discountsTotal: new Prisma.Decimal("10.00"),
        actualCashCounted: new Prisma.Decimal("70.00"),
        paymentMethodEntries: [
          paymentMethodEntry({ salesPaymentMethod: { name: "Cash", isCashEquivalent: true }, amount: new Prisma.Decimal("50.00") }),
          paymentMethodEntry({ id: "pme-2", salesPaymentMethod: { name: "Bolt Cash", isCashEquivalent: true }, amount: new Prisma.Decimal("30.00") }),
        ],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.physicalCashBasis).toBe("80.00");
      expect(result.cashReconciliation.expectedCash).toBe("70.00");
      expect(result.cashReconciliation.discrepancy).toBe("0.00");
      expect(result.cashReconciliation.status).toBe("BALANCED");
    });

    it("is SHORT when actual cash counted is below expected cash", async () => {
      const row = recordRow({
        discountsTotal: new Prisma.Decimal("0.00"),
        actualCashCounted: new Prisma.Decimal("95.00"),
        paymentMethodEntries: [paymentMethodEntry({ amount: new Prisma.Decimal("100.00") })],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.discrepancy).toBe("-5.00");
      expect(result.cashReconciliation.status).toBe("SHORT");
    });

    it("is OVER when actual cash counted exceeds expected cash", async () => {
      const row = recordRow({
        discountsTotal: new Prisma.Decimal("0.00"),
        actualCashCounted: new Prisma.Decimal("105.00"),
        paymentMethodEntries: [paymentMethodEntry({ amount: new Prisma.Decimal("100.00") })],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.discrepancy).toBe("5.00");
      expect(result.cashReconciliation.status).toBe("OVER");
    });

    it("is NOT_COUNTED — distinct from BALANCED — when no manager has entered actualCashCounted yet", async () => {
      const row = recordRow({
        actualCashCounted: null,
        paymentMethodEntries: [paymentMethodEntry({ amount: new Prisma.Decimal("100.00") })],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.actualCashCounted).toBeNull();
      expect(result.cashReconciliation.discrepancy).toBeNull();
      expect(result.cashReconciliation.status).toBe("NOT_COUNTED");
    });

    it("excludes non-cash payment methods from physicalCashBasis entirely, even with no cash methods at all", async () => {
      const row = recordRow({
        paymentMethodEntries: [
          paymentMethodEntry({ salesPaymentMethod: { name: "Trust/Card Payment", isCashEquivalent: false }, amount: new Prisma.Decimal("300.00") }),
        ],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.physicalCashBasis).toBe("0.00");
      expect(result.cashReconciliation.cardElectronicTotal).toBe("300.00");
      expect(result.cashReconciliation.expectedCash).toBe("0.00");
    });

    // Classification must come entirely from isCashEquivalent, never from
    // the payment method's name — "Trust/Card Payment" contains the word
    // "Card" but must still count as physical cash once a manager has
    // configured it that way. This is the mirror image of the test above
    // (same name, opposite flag, opposite result) — proof the outcome
    // tracks the flag, not the string.
    it("counts 'Trust/Card Payment' as physical cash when a manager has configured isCashEquivalent true, despite its name", async () => {
      const row = recordRow({
        paymentMethodEntries: [
          paymentMethodEntry({ salesPaymentMethod: { name: "Trust/Card Payment", isCashEquivalent: true }, amount: new Prisma.Decimal("300.00") }),
        ],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.physicalCashBasis).toBe("300.00");
      expect(result.cashReconciliation.cardElectronicTotal).toBe("0.00");
      expect(result.cashReconciliation.expectedCash).toBe("300.00");
    });

    it("reuses discountsTotal as-is for manualDiscounts, without altering totalSales", async () => {
      const row = recordRow({
        totalSales: new Prisma.Decimal("500.00"),
        discountsTotal: new Prisma.Decimal("12.50"),
        paymentMethodEntries: [paymentMethodEntry({ amount: new Prisma.Decimal("100.00") })],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.discountsTotal).toBe("12.50");
      expect(result.cashReconciliation.manualDiscounts).toBe("12.50");
      expect(result.totalSales).toBe("500.00");
    });
  });

  describe("POS-scoped manual discount (ADR-0043 amendment)", () => {
    // The exact worked scenario from the approved business rule: POS 1
    // (Trust Pay/Card Payment + Cash Draw) absorbs the €61.35 discount;
    // POS 2 (Bolt Cash) is completely untouched by it.
    function scenario(overrides: Partial<Record<string, unknown>> = {}) {
      return recordRow({
        discountsTotal: new Prisma.Decimal("61.35"),
        discountPosSourceId: "pos-1",
        discountPosSource: { name: "POS 1" },
        paymentMethodEntries: [
          paymentMethodEntry({
            id: "pme-1",
            salesPaymentMethodId: "trust-card-id",
            salesPaymentMethod: { name: "Trust Pay/Card Payment", isCashEquivalent: true },
            posSourceId: "pos-1",
            posSource: { name: "POS 1" },
            amount: new Prisma.Decimal("321.00"),
          }),
          paymentMethodEntry({
            id: "pme-2",
            salesPaymentMethodId: "cash-draw-id",
            salesPaymentMethod: { name: "Cash Draw", isCashEquivalent: true },
            posSourceId: "pos-1",
            posSource: { name: "POS 1" },
            amount: new Prisma.Decimal("259.65"),
          }),
          paymentMethodEntry({
            id: "pme-3",
            salesPaymentMethodId: "bolt-cash-id",
            salesPaymentMethod: { name: "Bolt Cash", isCashEquivalent: true },
            posSourceId: "pos-2",
            posSource: { name: "POS 2" },
            amount: new Prisma.Decimal("251.98"),
          }),
        ],
        ...overrides,
      });
    }

    // Items 1, 2, 3, 4, 5, 6, 14 — the exact worked scenario, end to end.
    it("applies the discount only to the selected POS source's bucket, leaving every other POS source's cash untouched", async () => {
      const row = scenario();
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");
      const cash = result.cashReconciliation;

      const pos1 = cash.cashByPosSource.find((b) => b.posSourceId === "pos-1");
      const pos2 = cash.cashByPosSource.find((b) => b.posSourceId === "pos-2");

      // POS 1 (discountable): gross - discount = expected.
      expect(pos1).toMatchObject({
        posSourceName: "POS 1",
        grossCashBasis: "580.65",
        discountApplied: "61.35",
        expectedCash: "519.30",
      });
      // POS 2 (non-discountable): gross = expected, discount is zero.
      expect(pos2).toMatchObject({
        posSourceName: "POS 2",
        grossCashBasis: "251.98",
        discountApplied: "0.00",
        expectedCash: "251.98",
      });

      expect(cash.discountPosSourceId).toBe("pos-1");
      expect(cash.discountPosSourceName).toBe("POS 1");
      expect(cash.physicalCashBasis).toBe("832.63");
      expect(cash.manualDiscounts).toBe("61.35");
      // Overall expected cash equals the sum of every bucket's own expected
      // cash — €519.30 + €251.98.
      expect(cash.expectedCash).toBe("771.28");
      // Total Sales is a completely independent figure, untouched by any of
      // the above (posReportedTotal in recordRow() defaults to 1226.55).
      expect(result.totalSales).toBe("1226.55");
    });

    // Item 7 — actualCashCounted correctly produces the discrepancy, and
    // item 8 — SHORT status, using the card mockup's own worked figures.
    it("computes discrepancy/status against the POS-scoped expected cash — SHORT", async () => {
      const row = scenario({ actualCashCounted: new Prisma.Decimal("324.73") });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.expectedCash).toBe("771.28");
      expect(result.cashReconciliation.discrepancy).toBe("-446.55");
      expect(result.cashReconciliation.status).toBe("SHORT");
    });

    // Item 9 — BALANCED still works once a POS scope is set.
    it("is BALANCED when actual cash counted exactly matches the POS-scoped expected cash", async () => {
      const row = scenario({ actualCashCounted: new Prisma.Decimal("771.28") });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.discrepancy).toBe("0.00");
      expect(result.cashReconciliation.status).toBe("BALANCED");
    });

    // Item 10 — OVER still works once a POS scope is set.
    it("is OVER when actual cash counted exceeds the POS-scoped expected cash", async () => {
      const row = scenario({ actualCashCounted: new Prisma.Decimal("800.00") });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.discrepancy).toBe("28.72");
      expect(result.cashReconciliation.status).toBe("OVER");
    });

    // Item 11 — NOT_COUNTED still works once a POS scope is set.
    it("is NOT_COUNTED when no cash count has been entered, regardless of POS scope", async () => {
      const row = scenario({ actualCashCounted: null });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.actualCashCounted).toBeNull();
      expect(result.cashReconciliation.discrepancy).toBeNull();
      expect(result.cashReconciliation.status).toBe("NOT_COUNTED");
    });

    // Item 12 & 20 — discountPosSourceId null reproduces the exact legacy
    // global-discount math for the SAME entries, byte for byte: the
    // discount is subtracted once from the combined total, not from any
    // one POS's bucket.
    it("discountPosSourceId null reproduces the exact legacy combined-total behavior", async () => {
      const row = scenario({ discountPosSourceId: null, discountPosSource: null });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");
      const cash = result.cashReconciliation;

      expect(cash.discountPosSourceId).toBeNull();
      expect(cash.discountPosSourceName).toBeNull();
      // No individual bucket shows the discount — it's a purely
      // global/legacy figure at this point.
      for (const bucket of cash.cashByPosSource) {
        expect(bucket.discountApplied).toBe("0.00");
        expect(bucket.expectedCash).toBe(bucket.grossCashBasis);
      }
      // But the overall total still reflects it — identical to the
      // pre-amendment formula (physicalCashBasis - discountsTotal).
      expect(cash.physicalCashBasis).toBe("832.63");
      expect(cash.expectedCash).toBe("771.28");
    });

    // Item 17 — a POS source with only card/electronic entries (no
    // physical cash at all) never appears in cashByPosSource.
    it("omits a POS source from cashByPosSource entirely when it has no physical cash entries", async () => {
      const row = scenario({
        discountPosSourceId: null,
        discountPosSource: null,
        paymentMethodEntries: [
          paymentMethodEntry({
            id: "pme-1",
            salesPaymentMethodId: "cash-draw-id",
            salesPaymentMethod: { name: "Cash Draw", isCashEquivalent: true },
            posSourceId: "pos-1",
            posSource: { name: "POS 1" },
            amount: new Prisma.Decimal("100.00"),
          }),
          paymentMethodEntry({
            id: "pme-2",
            salesPaymentMethodId: "card-id",
            salesPaymentMethod: { name: "Card Terminal", isCashEquivalent: false },
            posSourceId: "pos-2",
            posSource: { name: "POS 2" },
            amount: new Prisma.Decimal("500.00"),
          }),
        ],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");
      const cash = result.cashReconciliation;

      expect(cash.cashByPosSource).toHaveLength(1);
      expect(cash.cashByPosSource[0].posSourceId).toBe("pos-1");
      expect(cash.cardElectronicTotal).toBe("500.00");
    });

    // A discount scoped to a POS source with zero cash entries recorded
    // today still surfaces transparently, rather than silently vanishing.
    it("still shows the discount-scoped POS bucket even when it has no cash entries yet today", async () => {
      const row = recordRow({
        discountsTotal: new Prisma.Decimal("20.00"),
        discountPosSourceId: "pos-1",
        discountPosSource: { name: "POS 1" },
        paymentMethodEntries: [
          paymentMethodEntry({
            salesPaymentMethod: { name: "Bolt Cash", isCashEquivalent: true },
            posSourceId: "pos-2",
            posSource: { name: "POS 2" },
            amount: new Prisma.Decimal("100.00"),
          }),
        ],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");
      const cash = result.cashReconciliation;

      const pos1 = cash.cashByPosSource.find((b) => b.posSourceId === "pos-1");
      expect(pos1).toMatchObject({
        posSourceName: "POS 1",
        grossCashBasis: "0.00",
        discountApplied: "20.00",
        expectedCash: "-20.00",
      });
      const pos2 = cash.cashByPosSource.find((b) => b.posSourceId === "pos-2");
      expect(pos2).toMatchObject({ grossCashBasis: "100.00", discountApplied: "0.00", expectedCash: "100.00" });
    });

    // Item 13 — a discountPosSourceId belonging to a different restaurant
    // must be rejected, mirroring every other client-supplied master-list
    // FK scope check in this module.
    it("create() rejects a discountPosSourceId belonging to a different restaurant", async () => {
      const posSourceRepository = createPosSourceRepository({
        findById: vi.fn().mockResolvedValue({ id: "pos-1", restaurantId: "other-rest", name: "POS 1" }),
      });
      const service = buildService({ posSourceRepository });

      await expect(
        service.create(
          "branch-1",
          { businessDate: "2026-08-03", source: "MANUAL", totalSales: 100, discountPosSourceId: "pos-1" },
          "user-1"
        )
      ).rejects.toThrow(SalesScopeMismatchError);
    });

    it("create() rejects a discountPosSourceId that doesn't exist at all", async () => {
      const posSourceRepository = createPosSourceRepository({ findById: vi.fn().mockResolvedValue(null) });
      const service = buildService({ posSourceRepository });

      await expect(
        service.create(
          "branch-1",
          { businessDate: "2026-08-03", source: "MANUAL", totalSales: 100, discountPosSourceId: "missing-pos" },
          "user-1"
        )
      ).rejects.toThrow(SalesScopeMismatchError);
    });

    it("update() rejects a discountPosSourceId belonging to a different restaurant", async () => {
      const posSourceRepository = createPosSourceRepository({
        findById: vi.fn().mockResolvedValue({ id: "pos-1", restaurantId: "other-rest", name: "POS 1" }),
      });
      const repository = createRepository();
      const service = buildService({ repository, posSourceRepository });

      await expect(
        service.update("sales-1", { discountPosSourceId: "pos-1" })
      ).rejects.toThrow(SalesScopeMismatchError);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("create()/update() accept a valid same-restaurant discountPosSourceId", async () => {
      const repository = createRepository();
      const service = buildService({ repository });

      await service.create(
        "branch-1",
        { businessDate: "2026-08-03", source: "MANUAL", totalSales: 100, discountPosSourceId: "pos-1" },
        "user-1"
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ discountPosSourceId: "pos-1" })
      );

      await service.update("sales-1", { discountPosSourceId: "pos-1" });
      expect(repository.update).toHaveBeenCalledWith(
        "sales-1",
        expect.objectContaining({ discountPosSourceId: "pos-1" })
      );
    });
  });

  describe("cash/electronic discount split (ADR-0043 second amendment)", () => {
    // The exact worked scenario from the current restaurant's business
    // problem: the POS can't record a discount against the actual amount
    // received, so staff enter one combined discountsTotal (€61.35)
    // covering both a cash portion (€49.45) and an electronic/card portion
    // (€11.90). Only the cash portion may reduce physical cash.
    function scenario(overrides: Partial<Record<string, unknown>> = {}) {
      return recordRow({
        discountsTotal: new Prisma.Decimal("61.35"),
        cashDiscountTotal: new Prisma.Decimal("49.45"),
        discountPosSourceId: "pos-1",
        discountPosSource: { name: "POS 1" },
        paymentMethodEntries: [
          paymentMethodEntry({
            id: "pme-1",
            salesPaymentMethodId: "cash-draw-id",
            salesPaymentMethod: { name: "Cash Draw", isCashEquivalent: true },
            posSourceId: "pos-1",
            posSource: { name: "POS 1" },
            amount: new Prisma.Decimal("122.20"),
          }),
          paymentMethodEntry({
            id: "pme-2",
            salesPaymentMethodId: "trust-card-id",
            salesPaymentMethod: { name: "Trust Pay/Card Payment", isCashEquivalent: false },
            posSourceId: "pos-1",
            posSource: { name: "POS 1" },
            amount: new Prisma.Decimal("199.00"),
          }),
          paymentMethodEntry({
            id: "pme-3",
            salesPaymentMethodId: "bolt-cash-id",
            salesPaymentMethod: { name: "Bolt Cash", isCashEquivalent: true },
            posSourceId: "pos-2",
            posSource: { name: "POS 2" },
            amount: new Prisma.Decimal("251.98"),
          }),
        ],
        ...overrides,
      });
    }

    // Item 7 — the exact worked example, end to end: only the cash portion
    // of the combined discount reduces physical cash; the electronic
    // portion (attached to a non-cash payment method) is never subtracted.
    it("applies only the cash-discount portion to physical cash, never the electronic portion — exact worked example", async () => {
      const row = scenario({ actualCashCounted: new Prisma.Decimal("324.73") });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");
      const cash = result.cashReconciliation;

      expect(cash.physicalCashBasis).toBe("374.18"); // Cash Draw + Bolt Cash
      expect(cash.cardElectronicTotal).toBe("199.00"); // Trust Pay/Card Payment
      expect(cash.manualDiscounts).toBe("61.35");
      expect(cash.cashDiscountTotal).toBe("49.45");
      expect(cash.electronicDiscountTotal).toBe("11.90");

      const pos1 = cash.cashByPosSource.find((b) => b.posSourceId === "pos-1");
      expect(pos1).toMatchObject({ grossCashBasis: "122.20", discountApplied: "49.45", expectedCash: "72.75" });
      const pos2 = cash.cashByPosSource.find((b) => b.posSourceId === "pos-2");
      expect(pos2).toMatchObject({ grossCashBasis: "251.98", discountApplied: "0.00", expectedCash: "251.98" });

      expect(cash.expectedCash).toBe("324.73"); // 72.75 + 251.98
      expect(cash.discrepancy).toBe("0.00");
      expect(cash.status).toBe("BALANCED");
    });

    // Item 5 — cash discount reduces physical cash.
    it("reduces physical cash by exactly cashDiscountTotal, not the full discountsTotal", async () => {
      const row = scenario();
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      expect(result.cashReconciliation.expectedCash).toBe("324.73");
    });

    // Item 6 — electronic/card discount never touches physical cash, even
    // though it is part of the same combined discountsTotal figure.
    it("never subtracts the electronic-discount portion from physical cash", async () => {
      const row = scenario();
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");

      // If the bug were present (subtracting the full 61.35), expectedCash
      // would be 312.83, not 324.73.
      expect(result.cashReconciliation.expectedCash).not.toBe("312.83");
      expect(result.cashReconciliation.expectedCash).toBe("324.73");
    });

    // Item 17 — a legacy/not-configured record (cashDiscountTotal null)
    // must not have any allocation invented for it; the full discountsTotal
    // keeps reducing cash exactly as it always has.
    it("treats cashDiscountTotal=null as not configured — full discountsTotal reduces cash, no invented split", async () => {
      const row = scenario({ cashDiscountTotal: null });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");
      const cash = result.cashReconciliation;

      expect(cash.cashDiscountTotal).toBeNull();
      expect(cash.electronicDiscountTotal).toBeNull();
      // Legacy formula: physicalCashBasis (374.18) - full discountsTotal
      // (61.35) applied to POS 1's bucket only.
      expect(cash.expectedCash).toBe("312.83");
      const pos1 = cash.cashByPosSource.find((b) => b.posSourceId === "pos-1");
      expect(pos1?.discountApplied).toBe("61.35");
    });

    // Item 22 — a restaurant that never configures cashDiscountTotal is not
    // forced into the split workflow; every field it never touches stays
    // null, and the calculation is byte-for-byte the pre-existing formula.
    it("is not forced into the cash/electronic split workflow when cashDiscountTotal is never set", async () => {
      const row = recordRow({
        discountsTotal: new Prisma.Decimal("10.00"),
        paymentMethodEntries: [
          paymentMethodEntry({ salesPaymentMethod: { name: "Cash", isCashEquivalent: true }, posSourceId: null, posSource: null, amount: new Prisma.Decimal("100.00") }),
        ],
      });
      const repository = createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(row) });
      const service = buildService({ repository });

      const result = await service.getDaily("branch-1", "2026-08-03");
      const cash = result.cashReconciliation;

      expect(cash.cashDiscountTotal).toBeNull();
      expect(cash.electronicDiscountTotal).toBeNull();
      expect(cash.expectedCash).toBe("90.00");
    });

    // Item 21 — two independently configured restaurants never share
    // hardcoded behavior; each one's own cashDiscountTotal (or lack of it)
    // is the only thing that determines its calculation.
    it("Restaurant A (split configured) and Restaurant B (not configured) compute independently from the same code path", async () => {
      const restaurantASplit = scenario({ actualCashCounted: new Prisma.Decimal("324.73") });
      const restaurantBNoSplit = recordRow({
        discountsTotal: new Prisma.Decimal("15.00"),
        paymentMethodEntries: [
          paymentMethodEntry({ salesPaymentMethod: { name: "Cash Register", isCashEquivalent: true }, posSourceId: null, posSource: null, amount: new Prisma.Decimal("200.00") }),
        ],
      });

      const serviceA = buildService({
        repository: createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(restaurantASplit) }),
      });
      const serviceB = buildService({
        repository: createRepository({ findByBranchAndDate: vi.fn().mockResolvedValue(restaurantBNoSplit) }),
      });

      const resultA = await serviceA.getDaily("branch-1", "2026-08-03");
      const resultB = await serviceB.getDaily("branch-1", "2026-08-03");

      expect(resultA.cashReconciliation.status).toBe("BALANCED");
      expect(resultA.cashReconciliation.cashDiscountTotal).toBe("49.45");

      expect(resultB.cashReconciliation.cashDiscountTotal).toBeNull();
      expect(resultB.cashReconciliation.expectedCash).toBe("185.00"); // 200 - 15, legacy formula
    });

    it("create() rejects a cashDiscountTotal greater than discountsTotal", async () => {
      const service = buildService();

      await expect(
        service.create(
          "branch-1",
          { businessDate: "2026-08-03", source: "MANUAL", totalSales: 100, discountsTotal: 20, cashDiscountTotal: 25 },
          "user-1"
        )
      ).rejects.toThrow(InvalidCashDiscountError);
    });

    it("update() rejects a cashDiscountTotal greater than the record's existing discountsTotal when discountsTotal isn't also being changed", async () => {
      const repository = createRepository({
        findById: vi.fn().mockResolvedValue(recordRow({ discountsTotal: new Prisma.Decimal("20.00") })),
      });
      const service = buildService({ repository });

      await expect(service.update("sales-1", { cashDiscountTotal: 25 })).rejects.toThrow(
        InvalidCashDiscountError
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("create()/update() accept a valid cashDiscountTotal at or below discountsTotal", async () => {
      const repository = createRepository({
        findById: vi.fn().mockResolvedValue(recordRow({ discountsTotal: new Prisma.Decimal("61.35") })),
      });
      const service = buildService({ repository });

      await service.create(
        "branch-1",
        { businessDate: "2026-08-03", source: "MANUAL", totalSales: 100, discountsTotal: 61.35, cashDiscountTotal: 49.45 },
        "user-1"
      );
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ cashDiscountTotal: 49.45 }));

      await service.update("sales-1", { cashDiscountTotal: 49.45 });
      expect(repository.update).toHaveBeenCalledWith(
        "sales-1",
        expect.objectContaining({ cashDiscountTotal: 49.45 })
      );
    });
  });
});
