import {
  financeRecurringExpenseTemplateRepository,
  FinanceRecurringExpenseTemplateRepository,
} from "../repositories/finance-recurring-expense-template.repository.js";
import {
  financeExpenseRepository,
  FinanceExpenseRepository,
} from "../repositories/finance-expense.repository.js";
import {
  clampToMonth,
  currentPeriod,
  isPeriodBefore,
  nextPeriod,
  periodOf,
} from "../utils/finance-period.js";
import { logger } from "../lib/logger.js";
import type { RecurringExpenseTemplate } from "../generated/prisma/client.js";

// Defensive bound against a pathological startDate far in the past — not a
// real product limit for a household-scale recurring template.
const MAX_BACKFILL_PERIODS = 24;

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Lazy on-access recurrence generation — the only place recurrence logic
// lives in this codebase (no cron/scheduler exists anywhere yet). Called as
// the first step of the Finance read paths that need this period's data to
// be complete (Dashboard, Expense list). Swapping this for a real scheduler
// later means calling ensureCurrentPeriodGenerated() on a timer instead of
// on-request — no API, schema, or controller change required.
export class FinanceGenerationService {
  constructor(
    private readonly templateRepository: FinanceRecurringExpenseTemplateRepository = financeRecurringExpenseTemplateRepository,
    private readonly expenseRepository: FinanceExpenseRepository = financeExpenseRepository
  ) {}

  async ensureCurrentPeriodGenerated(period: string = currentPeriod()): Promise<void> {
    const templates = await this.templateRepository.findActive();

    await Promise.all(
      templates
        .filter(
          (template) =>
            template.lastGeneratedPeriod === null ||
            isPeriodBefore(template.lastGeneratedPeriod, period)
        )
        .map((template) => this.generateForTemplate(template, period))
    );
  }

  private async generateForTemplate(
    template: RecurringExpenseTemplate,
    targetPeriod: string
  ): Promise<void> {
    const startPeriod = periodOf(template.startDate);
    let walkPeriod = template.lastGeneratedPeriod
      ? nextPeriod(template.lastGeneratedPeriod)
      : startPeriod;

    let iterations = 0;

    while (!isPeriodBefore(targetPeriod, walkPeriod) && iterations < MAX_BACKFILL_PERIODS) {
      const instanceDate = clampToMonth(walkPeriod, template.dayOfMonth);

      // Mid-month startDate: the computed instance for the template's own
      // first period can land before it actually started — skip that
      // partial period rather than generating a pre-start expense.
      const isFirstPeriod = walkPeriod === startPeriod;
      const isBeforeStart = isFirstPeriod && instanceDate < template.startDate;

      if (!isBeforeStart) {
        try {
          await this.expenseRepository.createGeneratedInstance({
            date: instanceDate,
            amount: template.amount,
            category: template.category,
            description: template.name,
            recurringTemplateId: template.id,
            period: walkPeriod,
          });
        } catch (error) {
          logger.error(
            `[FinanceGenerationService] Failed to generate expense for template ${template.id}, period ${walkPeriod}: ${errorMessageOf(error)}`
          );
        }
      }

      if (walkPeriod === targetPeriod) {
        break;
      }

      walkPeriod = nextPeriod(walkPeriod);
      iterations += 1;
    }

    if (iterations >= MAX_BACKFILL_PERIODS) {
      logger.warn(
        `[FinanceGenerationService] Hit backfill cap (${MAX_BACKFILL_PERIODS}) for template ${template.id}.`
      );
    }

    await this.templateRepository.updateLastGeneratedPeriod(template.id, targetPeriod);
  }
}

export const financeGenerationService = new FinanceGenerationService();
