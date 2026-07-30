import {
  financeAuditEventRepository,
  FinanceAuditEventRepository,
  type CreateFinanceAuditEventData,
} from "../repositories/finance-audit-event.repository.js";

// The standardized entry point every Finance service calls to write an
// audit row, mirroring AutomationAuditService.record() — keeps "what counts
// as a valid Finance audit event" a single decision point. Because Finance
// is a shared workspace with no per-user scoping (see schema.prisma's
// Finance Management comment), this log is the only place "who did this"
// survives a delete.
export class FinanceAuditService {
  constructor(
    private readonly repository: FinanceAuditEventRepository = financeAuditEventRepository
  ) {}

  async record(input: CreateFinanceAuditEventData) {
    return this.repository.create(input);
  }
}

export const financeAuditService = new FinanceAuditService();
