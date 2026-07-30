import { describe, expect, it, vi } from "vitest";

import { FinanceGenerationService } from "./finance-generation.service.js";

function createTemplateRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActive: vi.fn().mockResolvedValue([]),
    updateLastGeneratedPeriod: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createExpenseRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    createGeneratedInstance: vi.fn().mockResolvedValue({ id: "generated-1" }),
    ...overrides,
  };
}

function template(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "template-1",
    name: "Rent",
    category: "HOUSING",
    amount: { toString: () => "1200.00" },
    dayOfMonth: 1,
    startDate: new Date(2026, 0, 1),
    lastGeneratedPeriod: null,
    isActive: true,
    ...overrides,
  };
}

describe("FinanceGenerationService", () => {
  it("generates a single instance for an active template never generated before, and checkpoints lastGeneratedPeriod", async () => {
    const templateRepository = createTemplateRepository({
      findActive: vi.fn().mockResolvedValue([
        // startDate in the same period as the target — no backfill needed;
        // backfill-across-multiple-periods is covered by its own test below.
        template({ startDate: new Date(2026, 6, 1), lastGeneratedPeriod: null }),
      ]),
    });
    const expenseRepository = createExpenseRepository();
    const service = new FinanceGenerationService(templateRepository as never, expenseRepository as never);

    await service.ensureCurrentPeriodGenerated("2026-07");

    expect(expenseRepository.createGeneratedInstance).toHaveBeenCalledTimes(1);
    expect(expenseRepository.createGeneratedInstance).toHaveBeenCalledWith(
      expect.objectContaining({ recurringTemplateId: "template-1", period: "2026-07" })
    );
    expect(templateRepository.updateLastGeneratedPeriod).toHaveBeenCalledWith(
      "template-1",
      "2026-07"
    );
  });

  it("backfills every missed period since the last generation, not just the current one", async () => {
    const templateRepository = createTemplateRepository({
      findActive: vi.fn().mockResolvedValue([template({ lastGeneratedPeriod: "2026-04" })]),
    });
    const expenseRepository = createExpenseRepository();
    const service = new FinanceGenerationService(templateRepository as never, expenseRepository as never);

    await service.ensureCurrentPeriodGenerated("2026-07");

    // 2026-05, 2026-06, 2026-07 — three missed periods generated
    expect(expenseRepository.createGeneratedInstance).toHaveBeenCalledTimes(3);
    const periods = expenseRepository.createGeneratedInstance.mock.calls.map(
      (call: unknown[]) => (call[0] as { period: string }).period
    );
    expect(periods).toEqual(["2026-05", "2026-06", "2026-07"]);
  });

  it("does not generate a partial period when startDate falls after that period's dayOfMonth instance", async () => {
    // startDate July 15, dayOfMonth 1 -> the computed July 1 instance is
    // before the template even started, so generation begins in August.
    const templateRepository = createTemplateRepository({
      findActive: vi
        .fn()
        .mockResolvedValue([
          template({ startDate: new Date(2026, 6, 15), dayOfMonth: 1, lastGeneratedPeriod: null }),
        ]),
    });
    const expenseRepository = createExpenseRepository();
    const service = new FinanceGenerationService(templateRepository as never, expenseRepository as never);

    await service.ensureCurrentPeriodGenerated("2026-07");

    expect(expenseRepository.createGeneratedInstance).not.toHaveBeenCalled();
    // The checkpoint still advances so next month's read doesn't re-walk this.
    expect(templateRepository.updateLastGeneratedPeriod).toHaveBeenCalledWith(
      "template-1",
      "2026-07"
    );
  });

  it("clamps dayOfMonth to the real last day of a short month", async () => {
    const templateRepository = createTemplateRepository({
      findActive: vi
        .fn()
        .mockResolvedValue([
          template({ dayOfMonth: 31, startDate: new Date(2026, 0, 1), lastGeneratedPeriod: "2026-01" }),
        ]),
    });
    const expenseRepository = createExpenseRepository();
    const service = new FinanceGenerationService(templateRepository as never, expenseRepository as never);

    await service.ensureCurrentPeriodGenerated("2026-02");

    expect(expenseRepository.createGeneratedInstance).toHaveBeenCalledWith(
      expect.objectContaining({ date: new Date(2026, 1, 28) })
    );
  });

  it("skips inactive templates entirely", async () => {
    const templateRepository = createTemplateRepository({
      findActive: vi.fn().mockResolvedValue([]), // repository already filters isActive
    });
    const expenseRepository = createExpenseRepository();
    const service = new FinanceGenerationService(templateRepository as never, expenseRepository as never);

    await service.ensureCurrentPeriodGenerated("2026-07");

    expect(expenseRepository.createGeneratedInstance).not.toHaveBeenCalled();
  });

  it("does not re-generate a template whose lastGeneratedPeriod already covers the target period", async () => {
    const templateRepository = createTemplateRepository({
      findActive: vi.fn().mockResolvedValue([template({ lastGeneratedPeriod: "2026-07" })]),
    });
    const expenseRepository = createExpenseRepository();
    const service = new FinanceGenerationService(templateRepository as never, expenseRepository as never);

    await service.ensureCurrentPeriodGenerated("2026-07");

    expect(expenseRepository.createGeneratedInstance).not.toHaveBeenCalled();
    expect(templateRepository.updateLastGeneratedPeriod).not.toHaveBeenCalled();
  });

  it("swallows a repository-level idempotency no-op (createGeneratedInstance returning null) without throwing", async () => {
    const templateRepository = createTemplateRepository({
      findActive: vi.fn().mockResolvedValue([template({ lastGeneratedPeriod: null })]),
    });
    const expenseRepository = createExpenseRepository({
      createGeneratedInstance: vi.fn().mockResolvedValue(null),
    });
    const service = new FinanceGenerationService(templateRepository as never, expenseRepository as never);

    await expect(service.ensureCurrentPeriodGenerated("2026-07")).resolves.not.toThrow();
    expect(templateRepository.updateLastGeneratedPeriod).toHaveBeenCalledWith(
      "template-1",
      "2026-07"
    );
  });
});
