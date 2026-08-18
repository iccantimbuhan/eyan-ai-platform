import { describe, expect, it, vi } from "vitest";

import { FinanceDashboardService } from "./finance-dashboard.service.js";
import { BudgetNotConfiguredError } from "../errors/finance.error.js";

// Minimal Decimal stand-in with real arithmetic — enough to prove
// remainingBudget and financeFacts are computed via Decimal arithmetic,
// never a JS float, without depending on the generated Prisma client in a
// unit test.
class FakeDecimal {
  constructor(private readonly value: number) {}
  minus(other: FakeDecimal) {
    return new FakeDecimal(this.value - other.value);
  }
  dividedBy(other: FakeDecimal) {
    return new FakeDecimal(this.value / other.value);
  }
  times(n: number) {
    return new FakeDecimal(this.value * n);
  }
  comparedTo(other: FakeDecimal) {
    return this.value - other.value;
  }
  isZero() {
    return this.value === 0;
  }
  toFixed(digits: number) {
    return this.value.toFixed(digits);
  }
}

function createExpenseRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sumForPeriod: vi.fn().mockResolvedValue({ _sum: { amount: new FakeDecimal(42.5) } }),
    groupByCategoryForPeriod: vi.fn().mockResolvedValue([
      { category: "FOOD", _sum: { amount: new FakeDecimal(42.5) } },
    ]),
    findRecent: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createBudgetService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getOrCreateForPeriodRaw: vi.fn().mockResolvedValue({
      id: "budget-1",
      period: "2026-07",
      monthlyLimit: new FakeDecimal(1900),
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    ...overrides,
  };
}

function createGenerationService(overrides: Partial<Record<string, unknown>> = {}) {
  return { ensureCurrentPeriodGenerated: vi.fn().mockResolvedValue(undefined), ...overrides };
}

describe("FinanceDashboardService", () => {
  it("computes remainingBudget as monthlyLimit - totalExpenses via Decimal arithmetic", async () => {
    const service = new FinanceDashboardService(
      createExpenseRepository() as never,
      createBudgetService() as never,
      createGenerationService() as never
    );

    const result = await service.getDashboard("2026-07");

    expect(result.totalExpenses).toBe("42.50");
    expect(result.remainingBudget).toBe("1857.50");
    expect(result.budget?.monthlyLimit).toBe("1900.00");
    expect(result.financeFacts.hasBudget).toBe(true);
    expect(result.financeFacts.categoryPercentages).toEqual([
      { category: "FOOD", total: "42.50", percentageOfTotalSpending: "100.0", percentageOfBudget: "2.2" },
    ]);
  });

  it("returns budget:null and remainingBudget:null when no budget has ever been configured", async () => {
    const budgetService = createBudgetService({
      getOrCreateForPeriodRaw: vi.fn().mockRejectedValue(new BudgetNotConfiguredError()),
    });
    const service = new FinanceDashboardService(
      createExpenseRepository() as never,
      budgetService as never,
      createGenerationService() as never
    );

    const result = await service.getDashboard("2026-07");

    expect(result.budget).toBeNull();
    expect(result.remainingBudget).toBeNull();
    expect(result.totalExpenses).toBe("42.50");
    // The regression this field exists to prevent: a missing monthlyLimit
    // must never be silently replaced by totalExpenses as the percentage
    // denominator.
    expect(result.financeFacts.hasBudget).toBe(false);
    expect(result.financeFacts.categoryPercentages[0].percentageOfBudget).toBeNull();
    expect(result.financeFacts.categoryPercentages[0].percentageOfTotalSpending).not.toBeNull();
  });

  it("triggers lazy recurrence generation for the requested period before aggregating", async () => {
    const generationService = createGenerationService();
    const service = new FinanceDashboardService(
      createExpenseRepository() as never,
      createBudgetService() as never,
      generationService as never
    );

    await service.getDashboard("2026-07");

    expect(generationService.ensureCurrentPeriodGenerated).toHaveBeenCalledWith("2026-07");
  });

  it("returns a 6-point spending trend ending at the requested period", async () => {
    const service = new FinanceDashboardService(
      createExpenseRepository() as never,
      createBudgetService() as never,
      createGenerationService() as never
    );

    const result = await service.getDashboard("2026-07");

    expect(result.spendingTrend).toHaveLength(6);
    expect(result.spendingTrend[5].period).toBe("2026-07");
    expect(result.spendingTrend[0].period).toBe("2026-02");
  });

  it("maps categoryBreakdown totals through Decimal.toFixed(2)", async () => {
    const service = new FinanceDashboardService(
      createExpenseRepository() as never,
      createBudgetService() as never,
      createGenerationService() as never
    );

    const result = await service.getDashboard("2026-07");

    expect(result.categoryBreakdown).toEqual([{ category: "FOOD", total: "42.50" }]);
  });

  it("wires financeFacts.categoryRanking through the full service, sorted by total descending regardless of groupBy row order", async () => {
    const expenseRepository = createExpenseRepository({
      sumForPeriod: vi.fn().mockResolvedValue({ _sum: { amount: new FakeDecimal(809.32) } }),
      groupByCategoryForPeriod: vi.fn().mockResolvedValue([
        { category: "FOOD", _sum: { amount: new FakeDecimal(145.42) } },
        { category: "TRANSPORTATION", _sum: { amount: new FakeDecimal(13.9) } },
        { category: "HOUSING", _sum: { amount: new FakeDecimal(650) } },
      ]),
    });
    const budgetService = createBudgetService({
      getOrCreateForPeriodRaw: vi.fn().mockResolvedValue({
        id: "budget-1",
        period: "2026-07",
        monthlyLimit: new FakeDecimal(1500),
        createdBy: null,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    });
    const service = new FinanceDashboardService(
      expenseRepository as never,
      budgetService as never,
      createGenerationService() as never
    );

    const result = await service.getDashboard("2026-07");

    expect(result.financeFacts.categoryRanking.map((c) => c.category)).toEqual([
      "HOUSING",
      "FOOD",
      "TRANSPORTATION",
    ]);
    const food = result.financeFacts.categoryPercentages.find((c) => c.category === "FOOD");
    expect(food?.percentageOfBudget).toBe("9.7");
    expect(result.financeFacts.hasCategorySpecificThresholds).toBe(false);
  });
});
