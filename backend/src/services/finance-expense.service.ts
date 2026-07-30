import {
  financeExpenseRepository,
  FinanceExpenseRepository,
} from "../repositories/finance-expense.repository.js";
import {
  financeRecurringExpenseTemplateRepository,
  FinanceRecurringExpenseTemplateRepository,
} from "../repositories/finance-recurring-expense-template.repository.js";
import {
  financeGenerationService,
  FinanceGenerationService,
} from "./finance-generation.service.js";
import { financeAuditService, FinanceAuditService } from "./finance-audit.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { paginate } from "../utils/pagination.js";
import { periodOf } from "../utils/finance-period.js";
import { logger } from "../lib/logger.js";
import type {
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from "../dto/finance-expense.dto.js";
import { mapExpenseToResponse } from "../dto/finance-expense.mapper.js";

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class FinanceExpenseService {
  constructor(
    private readonly repository: FinanceExpenseRepository = financeExpenseRepository,
    private readonly templateRepository: FinanceRecurringExpenseTemplateRepository = financeRecurringExpenseTemplateRepository,
    private readonly generationService: FinanceGenerationService = financeGenerationService,
    private readonly auditService: FinanceAuditService = financeAuditService
  ) {}

  async list(query: ListExpensesQueryDto = {}) {
    // Lazy on-access recurrence generation — an invisible side effect of
    // this read path, per the shared FinanceGenerationService. See
    // schema.prisma's Finance Management comment / ADR-0013 (planned).
    await this.generationService.ensureCurrentPeriodGenerated();

    const { page, pageSize, skip, take } = paginate({
      page: query.page,
      pageSize: query.pageSize,
    });

    const filters = {
      category: query.category,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      search: query.search,
    };

    const [items, total] = await Promise.all([
      this.repository.findMany({
        skip,
        take,
        sortBy: query.sortBy ?? "date",
        sortDir: query.sortDir ?? "desc",
        ...filters,
      }),
      this.repository.count(filters),
    ]);

    return {
      items: items.map(mapExpenseToResponse),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: string) {
    const expense = await this.repository.findById(id);

    if (!expense) {
      throw new NotFoundError("Expense not found.");
    }

    return mapExpenseToResponse(expense);
  }

  async create(data: CreateExpenseDto, actorId: string) {
    const date = new Date(data.date);

    let recurringTemplateId: string | null = null;
    let period: string | null = null;

    if (data.isRecurring) {
      const template = await this.templateRepository.create({
        name: data.description?.trim() || data.category,
        category: data.category,
        amount: data.amount,
        dayOfMonth: date.getDate(),
        startDate: date,
        lastGeneratedPeriod: periodOf(date),
        createdBy: actorId,
      });

      recurringTemplateId = template.id;
      period = periodOf(date);

      void this.auditService
        .record({
          actorId,
          action: "RECURRING_EXPENSE_TEMPLATE_CREATED",
          targetType: "RecurringExpenseTemplate",
          targetId: template.id,
        })
        .catch((error) =>
          logger.error(
            `[FinanceExpenseService] Failed to record audit event for template ${template.id}: ${errorMessageOf(error)}`
          )
        );
    }

    const expense = await this.repository.create({
      date,
      amount: data.amount,
      category: data.category,
      paymentMethod: data.paymentMethod,
      description: data.description,
      recurringTemplateId,
      period,
      createdBy: actorId,
    });

    void this.auditService
      .record({
        actorId,
        action: "EXPENSE_CREATED",
        targetType: "Expense",
        targetId: expense.id,
      })
      .catch((error) =>
        logger.error(
          `[FinanceExpenseService] Failed to record audit event for ${expense.id}: ${errorMessageOf(error)}`
        )
      );

    return mapExpenseToResponse(expense);
  }

  async update(id: string, data: UpdateExpenseDto, actorId: string) {
    await this.getById(id);

    const expense = await this.repository.update(id, {
      ...(data.date ? { date: new Date(data.date) } : {}),
      amount: data.amount,
      category: data.category,
      paymentMethod: data.paymentMethod,
      description: data.description,
      updatedBy: actorId,
    });

    void this.auditService
      .record({
        actorId,
        action: "EXPENSE_UPDATED",
        targetType: "Expense",
        targetId: expense.id,
      })
      .catch((error) =>
        logger.error(
          `[FinanceExpenseService] Failed to record audit event for ${expense.id}: ${errorMessageOf(error)}`
        )
      );

    return mapExpenseToResponse(expense);
  }

  async delete(id: string, actorId: string) {
    await this.getById(id);

    await this.repository.delete(id);

    void this.auditService
      .record({
        actorId,
        action: "EXPENSE_DELETED",
        targetType: "Expense",
        targetId: id,
      })
      .catch((error) =>
        logger.error(
          `[FinanceExpenseService] Failed to record audit event for ${id}: ${errorMessageOf(error)}`
        )
      );
  }
}

export const financeExpenseService = new FinanceExpenseService();
