import { financeExpenseService, FinanceExpenseService } from "./finance-expense.service.js";
import {
  financeDashboardService,
  FinanceDashboardService,
} from "./finance-dashboard.service.js";
import {
  workflowExecutionLogRepository,
  WorkflowExecutionLogRepository,
} from "../repositories/workflow-execution-log.repository.js";
import { ExpenseCategory, PaymentMethod } from "../generated/prisma/enums.js";
import { logger } from "../lib/logger.js";
import type {
  CategoriesResponseDto,
  CreateExpenseAutomatedDto,
} from "../dto/finance-automation.dto.js";

// n8n-facing surface (AI Finance Inbox) — kept separate from
// FinanceExpenseService/FinanceDashboardService (user-facing CRUD, JWT +
// requirePermission("finance")) since the automation surface has a
// different caller, different auth (authenticateService, ADR-0019 Decision
// 2), and different idempotency requirements (ADR-0019 Decision 5, applied
// to Finance per ADR-0024). All business logic — Decimal handling,
// recurring-template creation, audit events, dashboard aggregation — stays
// in the delegated services below; this class never touches a repository
// or Prisma directly.
export class FinanceAutomationService {
  constructor(
    private readonly expenseService: FinanceExpenseService = financeExpenseService,
    private readonly dashboardService: FinanceDashboardService = financeDashboardService,
    private readonly executionLogRepository: WorkflowExecutionLogRepository = workflowExecutionLogRepository
  ) {}

  // ADR-0019 Decision 5, mirrored from CrmAutomationIngestService — a
  // repeated call carrying an already-succeeded workflowExecutionId is a
  // safe replay, not a new mutation.
  private async findCompletedExecution(workflowName: string, workflowExecutionId: string) {
    const existing = await this.executionLogRepository.findByExecutionId(
      workflowName,
      workflowExecutionId
    );

    return existing?.status === "SUCCESS" ? existing : null;
  }

  private async recordExecution(
    workflowName: string,
    workflowExecutionId: string,
    durationMs?: number,
    errorMessage?: string
  ) {
    await this.executionLogRepository.create({
      domain: "finance",
      workflowName,
      n8nExecutionId: workflowExecutionId,
      status: "SUCCESS",
      durationMs: durationMs ?? null,
      errorMessage: errorMessage ?? null,
    });
  }

  // CREATE_EXPENSE and UPLOAD_RECEIPT both reach this one endpoint (AI
  // Finance Inbox plan §5). createdBy carries channel provenance
  // ("slack:U012ABC") rather than a User FK — Expense.createdBy is a plain
  // audit string (see finance-expense.repository.ts), the same posture
  // CrmAutomationIngestService uses with a null actorId, just with a real
  // value to offer here.
  //
  // Replay note: WorkflowExecutionLog carries no expenseId column in this
  // phase (no schema migration in scope — see ADR-0024's Consequences), so
  // a replay can confirm the write already succeeded but can't re-return
  // the created expense. This path only exists for a lost-response retry;
  // the caller already received the original response the first time.
  async createExpense(data: CreateExpenseAutomatedDto) {
    const replay = await this.findCompletedExecution(data.workflowName, data.workflowExecutionId);

    if (replay) {
      logger.debug(
        `[FinanceAutomationService] Replayed execution ${data.workflowExecutionId} (${data.workflowName}) — no-op.`
      );

      return { replayed: true as const, workflowExecutionId: data.workflowExecutionId };
    }

    const actorId = `${data.source.channel}:${data.source.externalUserId}`;

    const expense = await this.expenseService.create(
      {
        date: data.date,
        amount: data.amount,
        category: data.category,
        paymentMethod: data.paymentMethod,
        description: data.description,
        isRecurring: data.isRecurring,
      },
      actorId
    );

    await this.recordExecution(
      data.workflowName,
      data.workflowExecutionId,
      data.durationMs,
      data.errorMessage
    );

    return { replayed: false as const, ...expense };
  }

  async getDashboard(period?: string) {
    return this.dashboardService.getDashboard(period);
  }

  // Exposes the same enums finance-expense.validator.ts already validates
  // against (generated/prisma/enums.js) — not a new source of truth, just a
  // read-only surface so the AI Finance Inbox's classification/handler
  // workflows can fetch them instead of hardcoding a copy in n8n or a
  // prompt.
  async getCategories(): Promise<CategoriesResponseDto> {
    return {
      categories: Object.values(ExpenseCategory),
      paymentMethods: Object.values(PaymentMethod),
    };
  }
}

export const financeAutomationService = new FinanceAutomationService();
