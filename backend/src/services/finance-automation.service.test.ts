import { describe, expect, it, vi } from "vitest";

import { FinanceAutomationService } from "./finance-automation.service.js";
import type { CreateExpenseAutomatedDto } from "../dto/finance-automation.dto.js";

function expenseResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "expense-1",
    date: "2026-08-05T00:00:00.000Z",
    amount: "12.50",
    category: "FOOD",
    paymentMethod: null,
    description: null,
    receiptPath: null,
    isRecurring: false,
    recurringTemplateId: null,
    period: null,
    createdBy: "slack:U012ABC",
    updatedBy: null,
    createdAt: new Date(2026, 7, 5),
    updatedAt: new Date(2026, 7, 5),
    ...overrides,
  };
}

function createExpenseService(overrides: Partial<Record<string, unknown>> = {}) {
  return { create: vi.fn().mockResolvedValue(expenseResponse()), ...overrides };
}

function createDashboardService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getDashboard: vi.fn().mockResolvedValue({ period: "2026-08", totalExpenses: "0.00" }),
    ...overrides,
  };
}

function createExecutionLogRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findByExecutionId: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

const BASE_PAYLOAD: CreateExpenseAutomatedDto = {
  contractVersion: "1",
  workflowExecutionId: "exec-1",
  workflowName: "10-handle-create-expense",
  source: { channel: "slack", externalUserId: "U012ABC" },
  date: "2026-08-05",
  amount: "12.50",
  category: "FOOD" as never,
};

function buildService(overrides: {
  expenseService?: ReturnType<typeof createExpenseService>;
  dashboardService?: ReturnType<typeof createDashboardService>;
  executionLogRepository?: ReturnType<typeof createExecutionLogRepository>;
} = {}) {
  return new FinanceAutomationService(
    (overrides.expenseService ?? createExpenseService()) as never,
    (overrides.dashboardService ?? createDashboardService()) as never,
    (overrides.executionLogRepository ?? createExecutionLogRepository()) as never
  );
}

describe("FinanceAutomationService", () => {
  describe("createExpense", () => {
    it("delegates to FinanceExpenseService.create with channel-derived provenance and records the execution", async () => {
      const expenseService = createExpenseService();
      const executionLogRepository = createExecutionLogRepository();
      const service = buildService({ expenseService, executionLogRepository });

      const result = await service.createExpense(BASE_PAYLOAD);

      expect(expenseService.create).toHaveBeenCalledWith(
        {
          date: "2026-08-05",
          amount: "12.50",
          category: "FOOD",
          paymentMethod: undefined,
          description: undefined,
          isRecurring: undefined,
        },
        "slack:U012ABC"
      );
      expect(executionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: "finance",
          workflowName: "10-handle-create-expense",
          n8nExecutionId: "exec-1",
          status: "SUCCESS",
        })
      );
      expect(result.replayed).toBe(false);
      expect(result).toMatchObject({ id: "expense-1" });
    });

    it("never duplicates FinanceExpenseService's own Decimal/recurring/audit logic — it only forwards data", async () => {
      const expenseService = createExpenseService();
      const service = buildService({ expenseService });

      await service.createExpense({ ...BASE_PAYLOAD, isRecurring: true });

      expect(expenseService.create).toHaveBeenCalledTimes(1);
      expect(expenseService.create).toHaveBeenCalledWith(
        expect.objectContaining({ isRecurring: true }),
        expect.any(String)
      );
    });

    it("is idempotent — a replayed workflowExecutionId with a prior SUCCESS is a no-op, not a re-applied write", async () => {
      const expenseService = createExpenseService();
      const executionLogRepository = createExecutionLogRepository({
        findByExecutionId: vi.fn().mockResolvedValue({ status: "SUCCESS" }),
      });
      const service = buildService({ expenseService, executionLogRepository });

      const result = await service.createExpense(BASE_PAYLOAD);

      expect(expenseService.create).not.toHaveBeenCalled();
      expect(executionLogRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual({ replayed: true, workflowExecutionId: "exec-1" });
    });

    it("does not treat a prior FAILED execution as a replay", async () => {
      const expenseService = createExpenseService();
      const executionLogRepository = createExecutionLogRepository({
        findByExecutionId: vi.fn().mockResolvedValue({ status: "FAILED" }),
      });
      const service = buildService({ expenseService, executionLogRepository });

      const result = await service.createExpense(BASE_PAYLOAD);

      expect(expenseService.create).toHaveBeenCalledTimes(1);
      expect(result.replayed).toBe(false);
    });
  });

  describe("getDashboard", () => {
    it("delegates to FinanceDashboardService.getDashboard", async () => {
      const dashboardService = createDashboardService();
      const service = buildService({ dashboardService });

      await service.getDashboard("2026-08");

      expect(dashboardService.getDashboard).toHaveBeenCalledWith("2026-08");
    });
  });

  describe("getCategories", () => {
    it("returns the real ExpenseCategory/PaymentMethod enum values, not a hardcoded copy", async () => {
      const service = buildService();

      const result = await service.getCategories();

      expect(result.categories).toContain("FOOD");
      expect(result.paymentMethods).toContain("CASH");
    });
  });
});
