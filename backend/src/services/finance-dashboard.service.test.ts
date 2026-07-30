import { describe, expect, it, vi } from "vitest";

import { FinanceDashboardService } from "./finance-dashboard.service.js";
import { BudgetNotConfiguredError } from "../errors/finance.error.js";

// Minimal Decimal stand-in with real arithmetic — enough to prove
// remainingBudget is computed via Decimal.minus(), never a JS float
// subtraction, without depending on the generated Prisma client in a unit
// test.
class FakeDecimal {
  constructor(private readonly value: number) {}
  minus(other: FakeDecimal) {
    return new FakeDecimal(this.value - other.value);
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
});
