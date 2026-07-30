import { describe, expect, it, vi } from "vitest";

import { FinanceBudgetService } from "./finance-budget.service.js";
import { BudgetNotConfiguredError } from "../errors/finance.error.js";

function decimal(value: string) {
  return { toFixed: () => value, toString: () => value };
}

function budgetRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "budget-1",
    period: "2026-07",
    monthlyLimit: decimal("1900.00"),
    createdBy: "user-1",
    updatedBy: null,
    createdAt: new Date(2026, 6, 1),
    updatedAt: new Date(2026, 6, 1),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findByPeriod: vi.fn().mockResolvedValue(null),
    findMostRecentBefore: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(budgetRow()),
    upsertByPeriod: vi.fn().mockResolvedValue(budgetRow()),
    ...overrides,
  };
}

function createAuditService(overrides: Partial<Record<string, unknown>> = {}) {
  return { record: vi.fn().mockResolvedValue({}), ...overrides };
}

describe("FinanceBudgetService", () => {
  it("getOrCreateForPeriod() returns the existing row when this period already has a budget", async () => {
    const repository = createRepository({
      findByPeriod: vi.fn().mockResolvedValue(budgetRow()),
    });
    const service = new FinanceBudgetService(repository as never, createAuditService() as never);

    const result = await service.getOrCreateForPeriod("2026-07");

    expect(result.monthlyLimit).toBe("1900.00");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("getOrCreateForPeriod() carries the previous period's limit forward when this period has no row yet", async () => {
    const previousLimit = decimal("1900.00");
    const repository = createRepository({
      findByPeriod: vi.fn().mockResolvedValue(null),
      findMostRecentBefore: vi
        .fn()
        .mockResolvedValue(budgetRow({ period: "2026-06", monthlyLimit: previousLimit })),
      create: vi.fn().mockResolvedValue(budgetRow({ period: "2026-07" })),
    });
    const service = new FinanceBudgetService(repository as never, createAuditService() as never);

    const result = await service.getOrCreateForPeriod("2026-07");

    expect(repository.create).toHaveBeenCalledWith({
      period: "2026-07",
      monthlyLimit: previousLimit,
    });
    expect(result.period).toBe("2026-07");
  });

  it("getOrCreateForPeriod() throws BudgetNotConfiguredError on the very first-ever run", async () => {
    const repository = createRepository({
      findByPeriod: vi.fn().mockResolvedValue(null),
      findMostRecentBefore: vi.fn().mockResolvedValue(null),
    });
    const service = new FinanceBudgetService(repository as never, createAuditService() as never);

    await expect(service.getOrCreateForPeriod("2026-07")).rejects.toThrow(
      BudgetNotConfiguredError
    );
  });

  it("setBudget() upserts by period and records a BUDGET_SET audit event", async () => {
    const repository = createRepository();
    const auditService = createAuditService();
    const service = new FinanceBudgetService(repository as never, auditService as never);

    await service.setBudget({ period: "2026-07", monthlyLimit: "1900.00" }, "user-1");

    expect(repository.upsertByPeriod).toHaveBeenCalledWith({
      period: "2026-07",
      monthlyLimit: "1900.00",
      actorId: "user-1",
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "BUDGET_SET", targetId: "budget-1" })
    );
  });
});
