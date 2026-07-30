import { describe, expect, it, vi } from "vitest";

import { FinanceExpenseService } from "./finance-expense.service.js";
import { NotFoundError } from "../errors/auth.error.js";

function decimal(value: string) {
  return { toFixed: () => value, toString: () => value };
}

function expenseRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "expense-1",
    date: new Date(2026, 6, 15),
    amount: decimal("42.50"),
    category: "FOOD",
    paymentMethod: null,
    description: "Groceries",
    receiptPath: null,
    recurringTemplateId: null,
    period: null,
    createdBy: "user-1",
    updatedBy: null,
    createdAt: new Date(2026, 6, 15),
    updatedAt: new Date(2026, 6, 15),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue(expenseRow()),
    findById: vi.fn().mockResolvedValue(expenseRow()),
    update: vi.fn().mockResolvedValue(expenseRow()),
    delete: vi.fn().mockResolvedValue(expenseRow()),
    findMany: vi.fn().mockResolvedValue([expenseRow()]),
    count: vi.fn().mockResolvedValue(1),
    ...overrides,
  };
}

function createTemplateRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "template-1" }),
    ...overrides,
  };
}

function createGenerationService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ensureCurrentPeriodGenerated: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createAuditService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    record: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("FinanceExpenseService", () => {
  it("create() with isRecurring=false creates a plain expense and never touches the template repository", async () => {
    const repository = createRepository();
    const templateRepository = createTemplateRepository();
    const service = new FinanceExpenseService(
      repository as never,
      templateRepository as never,
      createGenerationService() as never,
      createAuditService() as never
    );

    await service.create(
      { date: "2026-07-15", amount: "42.50", category: "FOOD", description: "Groceries" },
      "user-1"
    );

    expect(templateRepository.create).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recurringTemplateId: null,
        period: null,
        createdBy: "user-1",
      })
    );
  });

  it("create() with isRecurring=true creates a RecurringExpenseTemplate first, then links the expense to it", async () => {
    const repository = createRepository();
    const templateRepository = createTemplateRepository();
    const auditService = createAuditService();
    const service = new FinanceExpenseService(
      repository as never,
      templateRepository as never,
      createGenerationService() as never,
      auditService as never
    );

    await service.create(
      { date: "2026-07-01", amount: "1200.00", category: "HOUSING", isRecurring: true },
      "user-1"
    );

    expect(templateRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: "HOUSING", amount: "1200.00", dayOfMonth: 1 })
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ recurringTemplateId: "template-1", period: "2026-07" })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "RECURRING_EXPENSE_TEMPLATE_CREATED" })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "EXPENSE_CREATED" })
    );
  });

  it("list() runs lazy generation before querying, so a freshly-generated recurring instance is never missed", async () => {
    const repository = createRepository();
    const generationService = createGenerationService();
    const service = new FinanceExpenseService(
      repository as never,
      createTemplateRepository() as never,
      generationService as never,
      createAuditService() as never
    );

    await service.list();

    expect(generationService.ensureCurrentPeriodGenerated).toHaveBeenCalled();
  });

  it("getById() throws NotFoundError when the expense doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new FinanceExpenseService(
      repository as never,
      createTemplateRepository() as never,
      createGenerationService() as never,
      createAuditService() as never
    );

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("update() verifies the expense exists before writing", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new FinanceExpenseService(
      repository as never,
      createTemplateRepository() as never,
      createGenerationService() as never,
      createAuditService() as never
    );

    await expect(service.update("missing", { amount: "10.00" }, "user-1")).rejects.toThrow(
      NotFoundError
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("delete() verifies the expense exists before deleting, and records an audit event", async () => {
    const repository = createRepository();
    const auditService = createAuditService();
    const service = new FinanceExpenseService(
      repository as never,
      createTemplateRepository() as never,
      createGenerationService() as never,
      auditService as never
    );

    await service.delete("expense-1", "user-1");

    expect(repository.delete).toHaveBeenCalledWith("expense-1");
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "EXPENSE_DELETED", targetId: "expense-1" })
    );
  });
});
