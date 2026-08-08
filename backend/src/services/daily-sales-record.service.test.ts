import { describe, expect, it, vi } from "vitest";

import { DailySalesRecordService, truncateToUtcDate } from "./daily-sales-record.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { DailySalesRecordAlreadyExistsError } from "../errors/sales.error.js";
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

function buildService(overrides: {
  repository?: Partial<Record<string, unknown>>;
  branchRepository?: Partial<Record<string, unknown>>;
} = {}) {
  return new DailySalesRecordService(
    createRepository(overrides.repository) as never,
    createBranchRepository(overrides.branchRepository) as never
  );
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
});
