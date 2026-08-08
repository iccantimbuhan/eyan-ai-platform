import { describe, expect, it, vi } from "vitest";

import { SalesAggregationService } from "./sales-aggregation.service.js";
import { Prisma } from "../generated/prisma/client.js";

// Decimal fields need to be real Prisma.Decimal instances (not duck-typed
// fakes) because the aggregation service does real .plus()/.comparedTo()
// arithmetic on them — same reasoning stock-movement.service.test.ts uses.
function record(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    businessDate: new Date("2026-08-03T00:00:00.000Z"),
    totalSales: new Prisma.Decimal("0"),
    discountsTotal: new Prisma.Decimal("0"),
    vouchersAmount: new Prisma.Decimal("0"),
    vouchersCount: 0,
    actualCashCounted: null,
    discountPosSourceId: null,
    discountPosSource: null,
    cashDiscountTotal: null,
    channelEntries: [],
    paymentMethodEntries: [],
    categoryEntries: [],
    itemEntries: [],
    ...overrides,
  };
}

function channelEntry(
  salesChannelId: string,
  channelName: string,
  amount: string,
  posSource: { id: string; name: string } | null = null,
  transactionCount: number | null = null
) {
  return {
    salesChannelId,
    salesChannel: { name: channelName },
    amount: new Prisma.Decimal(amount),
    posSourceId: posSource?.id ?? null,
    posSource: posSource ? { name: posSource.name } : null,
    transactionCount,
  };
}

function paymentMethodEntry(
  id: string,
  name: string,
  amount: string,
  transactionCount: number | null = null,
  posSource: { id: string; name: string } | null = null,
  isCashEquivalent = false
) {
  return {
    salesPaymentMethodId: id,
    salesPaymentMethod: { name, isCashEquivalent },
    amount: new Prisma.Decimal(amount),
    transactionCount,
    posSourceId: posSource?.id ?? null,
    posSource: posSource ? { name: posSource.name } : null,
  };
}

function itemEntry(itemName: string, quantity: string, amount: string, menuItemId: string | null = null) {
  return { menuItemId, itemName, quantity: new Prisma.Decimal(quantity), amount: new Prisma.Decimal(amount) };
}

function categoryEntry(id: string, name: string, amount: string, quantity: string | null = null) {
  return {
    salesCategoryId: id,
    salesCategory: { name },
    amount: new Prisma.Decimal(amount),
    quantity: quantity ? new Prisma.Decimal(quantity) : null,
  };
}

function buildService(records: unknown[]) {
  const repository = { findManyByBranchIdAndDateRange: vi.fn().mockResolvedValue(records) };
  return { service: new SalesAggregationService(repository as never), repository };
}

describe("SalesAggregationService.getWeeklySummary", () => {
  it("returns zeroed totals for a week with no recorded sales", async () => {
    const { service } = buildService([]);

    const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

    expect(summary.totalSales).toBe("0.00");
    expect(summary.dailySales).toEqual([]);
    expect(summary.channelTotals).toEqual([]);
    expect(summary.topItems).toEqual([]);
  });

  it("sums totalSales/discounts/vouchers across every record in range using Decimal, not floats", async () => {
    const records = [
      record({ totalSales: new Prisma.Decimal("1083.20"), discountsTotal: new Prisma.Decimal("10.10") }),
      record({ totalSales: new Prisma.Decimal("1201.55"), discountsTotal: new Prisma.Decimal("5.05") }),
      record({ totalSales: new Prisma.Decimal("1194.60"), vouchersAmount: new Prisma.Decimal("20.00"), vouchersCount: 4 }),
    ];
    const { service } = buildService(records);

    const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

    expect(summary.totalSales).toBe("3479.35");
    expect(summary.discountsTotal).toBe("15.15");
    expect(summary.vouchersAmount).toBe("20.00");
    expect(summary.vouchersCount).toBe(4);
    expect(summary.dailySales).toHaveLength(3);
  });

  it("groups channel entries by salesChannelId across multiple days", async () => {
    const records = [
      record({ channelEntries: [channelEntry("wolt-id", "Wolt", "229.05"), channelEntry("bolt-id", "Bolt", "152.25")] }),
      record({ channelEntries: [channelEntry("wolt-id", "Wolt", "180.00")] }),
    ];
    const { service } = buildService(records);

    const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

    const wolt = summary.channelTotals.find((c) => c.salesChannelId === "wolt-id");
    const bolt = summary.channelTotals.find((c) => c.salesChannelId === "bolt-id");
    expect(wolt?.amount).toBe("409.05");
    expect(bolt?.amount).toBe("152.25");
  });

  it("sums transactionCount alongside amount for payment methods", async () => {
    const records = [
      record({ paymentMethodEntries: [paymentMethodEntry("m1", "Electronic", "100.00", 5)] }),
      record({ paymentMethodEntries: [paymentMethodEntry("m1", "Electronic", "50.00", 3)] }),
    ];
    const { service } = buildService(records);

    const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

    expect(summary.paymentMethodTotals[0]).toMatchObject({
      salesPaymentMethodId: "m1",
      amount: "150.00",
      transactionCount: 8,
    });
  });

  it("groups items by menuItemId when present, otherwise by itemName, and sorts topItems by amount descending", async () => {
    const records = [
      record({
        itemEntries: [
          itemEntry("Margherita", "3", "36.00", "menu-1"),
          itemEntry("Whole Chicken", "10", "150.00"),
        ],
      }),
      record({
        itemEntries: [
          itemEntry("Margherita", "2", "24.00", "menu-1"),
          itemEntry("Sprite", "1", "2.00"),
        ],
      }),
    ];
    const { service } = buildService(records);

    const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

    expect(summary.topItems[0]).toMatchObject({ itemName: "Whole Chicken", amount: "150.00" });
    expect(summary.topItems[1]).toMatchObject({ key: "menu-1", itemName: "Margherita", quantity: "5.00", amount: "60.00" });
    expect(summary.topItems[2]).toMatchObject({ itemName: "Sprite", amount: "2.00" });
  });

  it("limits topItems to the top 10 by amount", async () => {
    const entries = Array.from({ length: 15 }, (_, i) => itemEntry(`Item ${i}`, "1", String(i + 1)));
    const { service } = buildService([record({ itemEntries: entries })]);

    const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

    expect(summary.topItems).toHaveLength(10);
    expect(summary.topItems[0].itemName).toBe("Item 14");
  });

  describe("coverage — missing days must never be treated as zero", () => {
    it("reports every day in range as missing when there are no records", async () => {
      const { service } = buildService([]);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.coverage.daysInRange).toBe(7);
      expect(summary.coverage.daysRecorded).toBe(0);
      expect(summary.coverage.missingDays).toBe(7);
      expect(summary.coverage.missingDates).toEqual([
        "2026-08-03",
        "2026-08-04",
        "2026-08-05",
        "2026-08-06",
        "2026-08-07",
        "2026-08-08",
        "2026-08-09",
      ]);
      expect(summary.coverage.averageSalesPerRecordedDay).toBeNull();
    });

    it("identifies exactly which days are missing when some days are recorded", async () => {
      const records = [
        record({ businessDate: new Date("2026-08-03T00:00:00.000Z"), totalSales: new Prisma.Decimal("100.00") }),
        record({ businessDate: new Date("2026-08-05T00:00:00.000Z"), totalSales: new Prisma.Decimal("200.00") }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-05");

      expect(summary.coverage.daysInRange).toBe(3);
      expect(summary.coverage.daysRecorded).toBe(2);
      expect(summary.coverage.missingDays).toBe(1);
      expect(summary.coverage.missingDates).toEqual(["2026-08-04"]);
      expect(summary.coverage.averageSalesPerRecordedDay).toBe("150.00");
    });

    it("reports zero missing days when every day in range is recorded", async () => {
      const records = [
        record({ businessDate: new Date("2026-08-03T00:00:00.000Z") }),
        record({ businessDate: new Date("2026-08-04T00:00:00.000Z") }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-04");

      expect(summary.coverage.missingDays).toBe(0);
      expect(summary.coverage.missingDates).toEqual([]);
    });
  });

  describe("reconciliation — surfaces variance without adjusting anything", () => {
    it("returns a null POS variance when no record in range has a POS reported total", async () => {
      const records = [record({ totalSales: new Prisma.Decimal("500.00") })];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.reconciliation.posReportedTotal).toBeNull();
      expect(summary.reconciliation.posReportedRecordCount).toBe(0);
      expect(summary.reconciliation.varianceVsPosReportedTotal).toBeNull();
    });

    it("computes the variance between totalSales and posReportedTotal without changing either", async () => {
      const records = [
        record({ totalSales: new Prisma.Decimal("1226.55"), posReportedTotal: new Prisma.Decimal("1226.55") }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.reconciliation.posReportedTotal).toBe("1226.55");
      expect(summary.reconciliation.posReportedRecordCount).toBe(1);
      expect(summary.reconciliation.varianceVsPosReportedTotal).toBe("0.00");
    });

    it("computes a non-zero, clearly-labeled variance against channel entries — the spec's own worked example", async () => {
      const records = [
        record({
          totalSales: new Prisma.Decimal("1226.55"),
          posReportedTotal: new Prisma.Decimal("1226.55"),
          channelEntries: [
            channelEntry("wolt-id", "Wolt", "229.05"),
            channelEntry("bolt-id", "Bolt", "152.25"),
            channelEntry("mypos-id", "MyPOS", "213.20"),
            channelEntry("cash-id", "Cash", "264.15"),
          ],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      // 229.05 + 152.25 + 213.20 + 264.15 = 858.65
      expect(summary.reconciliation.channelEntriesTotal).toBe("858.65");
      expect(summary.reconciliation.varianceVsChannelEntriesTotal).toBe("367.90");
      // The mismatch is preserved exactly, never auto-adjusted.
      expect(summary.totalSales).toBe("1226.55");
    });
  });

  describe("channel/payment-method/category percentages — share of that breakdown's own total, not totalSales", () => {
    it("computes each channel's percent share of the channel entries total", async () => {
      const records = [
        record({
          channelEntries: [channelEntry("wolt-id", "Wolt", "2500.00"), channelEntry("bolt-id", "Bolt", "1900.00")],
        }),
        record({ channelEntries: [channelEntry("pos-id", "POS", "5100.00"), channelEntry("other-id", "Other", "1170.00")] }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      const wolt = summary.channelTotals.find((c) => c.salesChannelId === "wolt-id");
      const pos = summary.channelTotals.find((c) => c.salesChannelId === "pos-id");
      // Total channel entries = 2500 + 1900 + 5100 + 1170 = 10670
      expect(wolt?.percentOfChannelEntriesTotal).toBe("23.4");
      expect(pos?.percentOfChannelEntriesTotal).toBe("47.8");
    });

    it("returns null percentages when the breakdown's own total is zero", async () => {
      const { service } = buildService([record()]);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.channelTotals).toEqual([]);
      expect(summary.reconciliation.channelEntriesTotal).toBe("0.00");
    });

    it("computes category percent share independently of channel/payment totals", async () => {
      const records = [
        record({
          categoryEntries: [categoryEntry("burgers-id", "Burgers", "300.00"), categoryEntry("drinks-id", "Drinks", "100.00")],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      const burgers = summary.categoryTotals.find((c) => c.salesCategoryId === "burgers-id");
      expect(burgers?.percentOfCategoryEntriesTotal).toBe("75.0");
    });
  });

  describe("channel performance — active days and average per active day", () => {
    it("counts active days and computes average amount per active day per channel", async () => {
      const records = [
        record({ channelEntries: [channelEntry("wolt-id", "Wolt", "300.00")] }),
        record({ channelEntries: [channelEntry("wolt-id", "Wolt", "250.00")] }),
        record({ channelEntries: [] }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      const wolt = summary.channelTotals.find((c) => c.salesChannelId === "wolt-id");
      expect(wolt?.activeDays).toBe(2);
      expect(wolt?.amount).toBe("550.00");
      expect(wolt?.averageAmountPerActiveDay).toBe("275.00");
    });
  });

  describe("POS Source / Sales Channel Flexibility — posSourceTotals and channelsByPosSource", () => {
    it("buckets entries with no posSourceId under the 'unassigned' bucket, never dropping them", async () => {
      const records = [record({ channelEntries: [channelEntry("wolt-id", "Wolt", "300.00")] })];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.posSourceTotals).toEqual([
        {
          posSourceId: null,
          posSourceName: null,
          amount: "300.00",
          transactionCount: 0,
          percentOfChannelEntriesTotal: "100.0",
        },
      ]);
      expect(summary.channelsByPosSource).toEqual([
        { posSourceId: null, posSourceName: null, channels: [expect.objectContaining({ salesChannelId: "wolt-id", amount: "300.00" })] },
      ]);
    });

    it("splits sales by POS source when channel entries carry different posSourceIds — Example B (multiple POS terminals)", async () => {
      const pos1 = { id: "pos-1", name: "POS 1" };
      const pos2 = { id: "pos-2", name: "POS 2" };
      const records = [
        record({
          channelEntries: [
            channelEntry("mypos-id", "MyPOS / In-house", "420.30", pos1, 40),
            channelEntry("wolt-id", "Wolt", "486.49", pos2, 25),
            channelEntry("bolt-id", "Bolt", "281.58", pos2, 15),
          ],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      const pos1Total = summary.posSourceTotals.find((p) => p.posSourceId === "pos-1");
      const pos2Total = summary.posSourceTotals.find((p) => p.posSourceId === "pos-2");
      expect(pos1Total).toMatchObject({ posSourceName: "POS 1", amount: "420.30", transactionCount: 40 });
      expect(pos2Total).toMatchObject({ posSourceName: "POS 2", amount: "768.07", transactionCount: 40 });

      const pos2Bucket = summary.channelsByPosSource.find((b) => b.posSourceId === "pos-2");
      expect(pos2Bucket?.channels.map((c) => c.salesChannelId).sort()).toEqual(["bolt-id", "wolt-id"]);
    });

    it("sums the same channel across multiple POS sources into one channelTotals row, while still separating them per POS source", async () => {
      const pos1 = { id: "pos-1", name: "POS 1" };
      const pos2 = { id: "pos-2", name: "POS 2" };
      const records = [
        record({ channelEntries: [channelEntry("wolt-id", "Wolt", "100.00", pos1)] }),
        record({ channelEntries: [channelEntry("wolt-id", "Wolt", "50.00", pos2)] }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      const wolt = summary.channelTotals.find((c) => c.salesChannelId === "wolt-id");
      expect(wolt?.amount).toBe("150.00");

      const pos1Wolt = summary.channelsByPosSource.find((b) => b.posSourceId === "pos-1")?.channels[0];
      const pos2Wolt = summary.channelsByPosSource.find((b) => b.posSourceId === "pos-2")?.channels[0];
      expect(pos1Wolt?.amount).toBe("100.00");
      expect(pos2Wolt?.amount).toBe("50.00");
    });

    it("produces no posSourceTotals rows for a restaurant that never uses POS sources (Example C regression)", async () => {
      const records = [record({ channelEntries: [] })];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.posSourceTotals).toEqual([]);
      expect(summary.channelsByPosSource).toEqual([]);
      expect(summary.channelTotals).toEqual([]);
    });
  });

  describe("POS Source / Sales Channel Flexibility, extended to Payment Methods — paymentMethodPosSourceTotals and paymentMethodsByPosSource", () => {
    it("buckets entries with no posSourceId under the 'unassigned' bucket, never dropping them", async () => {
      const records = [record({ paymentMethodEntries: [paymentMethodEntry("cash-id", "Cash", "300.00")] })];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.paymentMethodPosSourceTotals).toEqual([
        {
          posSourceId: null,
          posSourceName: null,
          amount: "300.00",
          transactionCount: 0,
          percentOfPaymentMethodEntriesTotal: "100.0",
        },
      ]);
      expect(summary.paymentMethodsByPosSource).toEqual([
        {
          posSourceId: null,
          posSourceName: null,
          paymentMethods: [expect.objectContaining({ salesPaymentMethodId: "cash-id", amount: "300.00" })],
        },
      ]);
    });

    it("splits sales by POS source when payment-method entries carry different posSourceIds — POS 1: Cash/Card/Wolt, POS 2: Wolt/Bolt", async () => {
      const pos1 = { id: "pos-1", name: "POS 1" };
      const pos2 = { id: "pos-2", name: "POS 2" };
      const records = [
        record({
          paymentMethodEntries: [
            paymentMethodEntry("cash-id", "Cash", "200.00", 20, pos1),
            paymentMethodEntry("card-id", "Card", "220.30", 20, pos1),
            paymentMethodEntry("wolt-id", "Wolt", "486.49", 25, pos2),
            paymentMethodEntry("bolt-id", "Bolt", "281.58", 15, pos2),
          ],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      const pos1Total = summary.paymentMethodPosSourceTotals.find((p) => p.posSourceId === "pos-1");
      const pos2Total = summary.paymentMethodPosSourceTotals.find((p) => p.posSourceId === "pos-2");
      expect(pos1Total).toMatchObject({ posSourceName: "POS 1", amount: "420.30", transactionCount: 40 });
      expect(pos2Total).toMatchObject({ posSourceName: "POS 2", amount: "768.07", transactionCount: 40 });

      const pos1Bucket = summary.paymentMethodsByPosSource.find((b) => b.posSourceId === "pos-1");
      expect(pos1Bucket?.paymentMethods.map((m) => m.salesPaymentMethodId).sort()).toEqual(["card-id", "cash-id"]);
    });

    it("sums the same payment method across multiple POS sources into one paymentMethodTotals row, while still separating them per POS source — the same 'Wolt' payment method under both POS 1 and POS 2", async () => {
      const pos1 = { id: "pos-1", name: "POS 1" };
      const pos2 = { id: "pos-2", name: "POS 2" };
      const records = [
        record({ paymentMethodEntries: [paymentMethodEntry("wolt-id", "Wolt", "100.00", null, pos1)] }),
        record({ paymentMethodEntries: [paymentMethodEntry("wolt-id", "Wolt", "50.00", null, pos2)] }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      const wolt = summary.paymentMethodTotals.find((m) => m.salesPaymentMethodId === "wolt-id");
      expect(wolt?.amount).toBe("150.00");

      const pos1Wolt = summary.paymentMethodsByPosSource.find((b) => b.posSourceId === "pos-1")?.paymentMethods[0];
      const pos2Wolt = summary.paymentMethodsByPosSource.find((b) => b.posSourceId === "pos-2")?.paymentMethods[0];
      expect(pos1Wolt?.amount).toBe("100.00");
      expect(pos2Wolt?.amount).toBe("50.00");
    });

    it("keeps payment-method POS totals entirely separate from channel POS totals (never merged into one combined POS figure)", async () => {
      const pos1 = { id: "pos-1", name: "POS 1" };
      const records = [
        record({
          channelEntries: [channelEntry("wolt-id", "Wolt", "486.49", pos1)],
          paymentMethodEntries: [paymentMethodEntry("cash-id", "Cash", "200.00", null, pos1)],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      const channelPos1 = summary.posSourceTotals.find((p) => p.posSourceId === "pos-1");
      const paymentMethodPos1 = summary.paymentMethodPosSourceTotals.find((p) => p.posSourceId === "pos-1");
      expect(channelPos1?.amount).toBe("486.49");
      expect(paymentMethodPos1?.amount).toBe("200.00");
    });

    it("produces no paymentMethodPosSourceTotals rows for a restaurant that never uses POS sources (regression)", async () => {
      const records = [record({ paymentMethodEntries: [] })];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.paymentMethodPosSourceTotals).toEqual([]);
      expect(summary.paymentMethodsByPosSource).toEqual([]);
      expect(summary.paymentMethodTotals).toEqual([]);
    });
  });

  describe("dailySales — per-day POS and channel totals shown alongside totalSales", () => {
    it("includes posReportedTotal and channelEntriesTotal for each day, independent of totalSales", async () => {
      const records = [
        record({
          businessDate: new Date("2026-08-03T00:00:00.000Z"),
          totalSales: new Prisma.Decimal("1000.00"),
          posReportedTotal: new Prisma.Decimal("980.00"),
          channelEntries: [channelEntry("wolt-id", "Wolt", "400.00")],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.dailySales[0]).toMatchObject({
        date: "2026-08-03",
        totalSales: "1000.00",
        posReportedTotal: "980.00",
        channelEntriesTotal: "400.00",
      });
    });

    it("returns null posReportedTotal for a day with no POS report backing it", async () => {
      const records = [record({ posReportedTotal: null })];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.dailySales[0].posReportedTotal).toBeNull();
    });
  });

  describe("cash reconciliation (ADR-0043) — per-day figures and the weekly rollup", () => {
    it("computes physicalCashBasis/expectedCash/discrepancy/status per day, excluding non-cash methods", async () => {
      const records = [
        record({
          businessDate: new Date("2026-08-03T00:00:00.000Z"),
          discountsTotal: new Prisma.Decimal("10.00"),
          actualCashCounted: new Prisma.Decimal("70.00"),
          paymentMethodEntries: [
            paymentMethodEntry("cash-id", "Cash", "50.00", null, null, true),
            paymentMethodEntry("bolt-cash-id", "Bolt Cash", "30.00", null, null, true),
            paymentMethodEntry("card-id", "Trust/Card Payment", "999.00", null, null, false),
          ],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.dailySales[0]).toMatchObject({
        discountsTotal: "10.00",
        physicalCashBasis: "80.00",
        expectedCash: "70.00",
        actualCashCounted: "70.00",
        discrepancy: "0.00",
        status: "BALANCED",
      });
    });

    it("marks a day NOT_COUNTED — distinct from BALANCED — when no manager has entered a cash count", async () => {
      const records = [record({ actualCashCounted: null })];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.dailySales[0].status).toBe("NOT_COUNTED");
      expect(summary.dailySales[0].discrepancy).toBeNull();
    });

    it("rolls up totalExpectedCash across every day, but totalActualCashCounted/totalDiscrepancy only over counted days", async () => {
      const records = [
        record({
          businessDate: new Date("2026-08-03T00:00:00.000Z"),
          discountsTotal: new Prisma.Decimal("0"),
          actualCashCounted: new Prisma.Decimal("95.00"), // short by 5
          paymentMethodEntries: [paymentMethodEntry("cash-id", "Cash", "100.00", null, null, true)],
        }),
        record({
          businessDate: new Date("2026-08-04T00:00:00.000Z"),
          discountsTotal: new Prisma.Decimal("0"),
          actualCashCounted: new Prisma.Decimal("205.00"), // over by 5
          paymentMethodEntries: [paymentMethodEntry("cash-id", "Cash", "200.00", null, null, true)],
        }),
        record({
          // Not counted — its €50 expected cash must still count toward
          // totalExpectedCash, but must NOT drag totalActualCashCounted or
          // totalDiscrepancy down as if it were a €50 shortfall.
          businessDate: new Date("2026-08-05T00:00:00.000Z"),
          discountsTotal: new Prisma.Decimal("0"),
          actualCashCounted: null,
          paymentMethodEntries: [paymentMethodEntry("cash-id", "Cash", "50.00", null, null, true)],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.cashReconciliationSummary).toMatchObject({
        totalPhysicalCashBasis: "350.00",
        totalExpectedCash: "350.00",
        totalActualCashCounted: "300.00", // 95 + 205, the €50 not-counted day excluded
        totalDiscrepancy: "0.00", // -5 + 5, the not-counted day contributes nothing
        daysCounted: 2,
        daysBalanced: 0,
        daysShort: 1,
        daysOver: 1,
        daysNotCounted: 1,
      });
    });

    it("reuses discountsTotal as manualDiscounts and never lets it affect totalSales", async () => {
      const records = [
        record({ totalSales: new Prisma.Decimal("500.00"), discountsTotal: new Prisma.Decimal("25.00") }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.totalSales).toBe("500.00");
      expect(summary.dailySales[0].discountsTotal).toBe("25.00");
      expect(summary.cashReconciliationSummary.totalManualDiscounts).toBe("25.00");
    });

    it("tags each payment-method breakdown row with isCashEquivalent, independent of the channel dimension", async () => {
      const records = [
        record({
          paymentMethodEntries: [
            paymentMethodEntry("cash-id", "Cash", "100.00", null, null, true),
            paymentMethodEntry("card-id", "Card", "50.00", null, null, false),
          ],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      const cashTotal = summary.paymentMethodTotals.find((m) => m.salesPaymentMethodId === "cash-id");
      const cardTotal = summary.paymentMethodTotals.find((m) => m.salesPaymentMethodId === "card-id");
      expect(cashTotal?.isCashEquivalent).toBe(true);
      expect(cardTotal?.isCashEquivalent).toBe(false);
    });

    // Item 15 — weekly aggregation MUST use the exact same POS-scoped
    // formula as the single-record calculation, since both call the same
    // shared computeCashReconciliation function. Same worked scenario:
    // POS 1 (Trust Pay/Card + Cash Draw) absorbs the discount, POS 2
    // (Bolt Cash) is untouched.
    it("applies a POS-scoped manual discount identically to the single-record calculation", async () => {
      const pos1 = { id: "pos-1", name: "POS 1" };
      const pos2 = { id: "pos-2", name: "POS 2" };
      const records = [
        record({
          discountsTotal: new Prisma.Decimal("61.35"),
          discountPosSourceId: "pos-1",
          discountPosSource: { name: "POS 1" },
          actualCashCounted: new Prisma.Decimal("324.73"),
          paymentMethodEntries: [
            paymentMethodEntry("trust-card-id", "Trust Pay/Card Payment", "321.00", null, pos1, true),
            paymentMethodEntry("cash-draw-id", "Cash Draw", "259.65", null, pos1, true),
            paymentMethodEntry("bolt-cash-id", "Bolt Cash", "251.98", null, pos2, true),
          ],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      // Per-day flat figures (dailySales[]) reflect the POS-scoped total.
      expect(summary.dailySales[0]).toMatchObject({
        discountsTotal: "61.35",
        physicalCashBasis: "832.63",
        expectedCash: "771.28",
        actualCashCounted: "324.73",
        discrepancy: "-446.55",
        status: "SHORT",
      });

      // The weekly rollup summary is built from that same corrected figure.
      expect(summary.cashReconciliationSummary).toMatchObject({
        totalPhysicalCashBasis: "832.63",
        totalExpectedCash: "771.28",
        totalActualCashCounted: "324.73",
        totalDiscrepancy: "-446.55",
        daysCounted: 1,
        daysShort: 1,
        daysBalanced: 0,
        daysOver: 0,
      });
    });

    // Item 19 — the cash/electronic discount split (ADR-0043 second
    // amendment) must produce identical figures whether read from the
    // single-record calculation or the weekly rollup, since both call the
    // exact same shared computeCashReconciliation function. Same worked
    // scenario as daily-sales-record.service.test.ts's own split test.
    it("applies the cash/electronic discount split identically to the single-record calculation, including the weekly rollup total", async () => {
      const pos1 = { id: "pos-1", name: "POS 1" };
      const pos2 = { id: "pos-2", name: "POS 2" };
      const records = [
        record({
          discountsTotal: new Prisma.Decimal("61.35"),
          cashDiscountTotal: new Prisma.Decimal("49.45"),
          discountPosSourceId: "pos-1",
          discountPosSource: { name: "POS 1" },
          actualCashCounted: new Prisma.Decimal("324.73"),
          paymentMethodEntries: [
            paymentMethodEntry("cash-draw-id", "Cash Draw", "122.20", null, pos1, true),
            paymentMethodEntry("trust-card-id", "Trust Pay/Card Payment", "199.00", null, pos1, false),
            paymentMethodEntry("bolt-cash-id", "Bolt Cash", "251.98", null, pos2, true),
          ],
        }),
      ];
      const { service } = buildService(records);

      const summary = await service.getWeeklySummary("branch-1", "2026-08-03", "2026-08-09");

      expect(summary.dailySales[0]).toMatchObject({
        discountsTotal: "61.35",
        physicalCashBasis: "374.18",
        cashDiscountTotal: "49.45",
        electronicDiscountTotal: "11.90",
        expectedCash: "324.73",
        actualCashCounted: "324.73",
        discrepancy: "0.00",
        status: "BALANCED",
      });

      // Weekly rollup's totalExpectedCash is accumulated from this exact
      // per-day figure — never re-derived from totalPhysicalCashBasis minus
      // the raw (un-split) discountsTotal, which would silently ignore the
      // electronic-discount portion (the bug this amendment fixes at the
      // weekly level too).
      expect(summary.cashReconciliationSummary).toMatchObject({
        totalPhysicalCashBasis: "374.18",
        totalExpectedCash: "324.73",
        totalActualCashCounted: "324.73",
        totalDiscrepancy: "0.00",
        daysCounted: 1,
        daysBalanced: 1,
        daysShort: 0,
        daysOver: 0,
      });
    });
  });
});

describe("SalesAggregationService.getComparison", () => {
  it("uses the two explicit date ranges supplied by the caller — never inferring the previous period itself", async () => {
    const repository = {
      findManyByBranchIdAndDateRange: vi
        .fn()
        .mockResolvedValueOnce([record({ totalSales: new Prisma.Decimal("1000.00") })])
        .mockResolvedValueOnce([record({ totalSales: new Prisma.Decimal("800.00") })]),
    };
    const service = new SalesAggregationService(repository as never);

    const comparison = await service.getComparison(
      "branch-1",
      "2026-08-10",
      "2026-08-16",
      "2026-08-03",
      "2026-08-09"
    );

    expect(repository.findManyByBranchIdAndDateRange).toHaveBeenNthCalledWith(
      1,
      "branch-1",
      new Date("2026-08-10T00:00:00.000Z"),
      new Date("2026-08-16T00:00:00.000Z")
    );
    expect(repository.findManyByBranchIdAndDateRange).toHaveBeenNthCalledWith(
      2,
      "branch-1",
      new Date("2026-08-03T00:00:00.000Z"),
      new Date("2026-08-09T00:00:00.000Z")
    );
    expect(comparison.totalSalesComparison).toMatchObject({
      current: "1000.00",
      previous: "800.00",
      change: "200.00",
      changePercent: "25.0",
    });
  });

  it("returns null changePercent — not an invalid/infinite value — when the previous period has no sales data", async () => {
    const repository = {
      findManyByBranchIdAndDateRange: vi
        .fn()
        .mockResolvedValueOnce([record({ totalSales: new Prisma.Decimal("500.00") })])
        .mockResolvedValueOnce([]),
    };
    const service = new SalesAggregationService(repository as never);

    const comparison = await service.getComparison(
      "branch-1",
      "2026-08-10",
      "2026-08-16",
      "2026-08-03",
      "2026-08-09"
    );

    expect(comparison.totalSalesComparison.previous).toBe("0.00");
    expect(comparison.totalSalesComparison.changePercent).toBeNull();
  });

  it("includes a comparison row for a channel present in only one of the two periods", async () => {
    const repository = {
      findManyByBranchIdAndDateRange: vi
        .fn()
        .mockResolvedValueOnce([record({ channelEntries: [channelEntry("wolt-id", "Wolt", "300.00")] })])
        .mockResolvedValueOnce([record({ channelEntries: [] })]),
    };
    const service = new SalesAggregationService(repository as never);

    const comparison = await service.getComparison(
      "branch-1",
      "2026-08-10",
      "2026-08-16",
      "2026-08-03",
      "2026-08-09"
    );

    const wolt = comparison.channelComparison.find((c) => c.key === "wolt-id");
    expect(wolt).toMatchObject({ current: "300.00", previous: "0.00", changePercent: null });
  });

  it("computes category and top-item comparisons independently of channel comparisons", async () => {
    const repository = {
      findManyByBranchIdAndDateRange: vi
        .fn()
        .mockResolvedValueOnce([
          record({
            categoryEntries: [categoryEntry("burgers-id", "Burgers", "400.00")],
            itemEntries: [itemEntry("Margherita", "10", "100.00", "menu-1")],
          }),
        ])
        .mockResolvedValueOnce([
          record({
            categoryEntries: [categoryEntry("burgers-id", "Burgers", "300.00")],
            itemEntries: [itemEntry("Margherita", "8", "80.00", "menu-1")],
          }),
        ]),
    };
    const service = new SalesAggregationService(repository as never);

    const comparison = await service.getComparison(
      "branch-1",
      "2026-08-10",
      "2026-08-16",
      "2026-08-03",
      "2026-08-09"
    );

    expect(comparison.categoryComparison[0]).toMatchObject({ key: "burgers-id", current: "400.00", previous: "300.00" });
    expect(comparison.topItemsComparison[0]).toMatchObject({ key: "menu-1", current: "100.00", previous: "80.00" });
  });
});
