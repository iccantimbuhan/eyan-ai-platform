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
});
