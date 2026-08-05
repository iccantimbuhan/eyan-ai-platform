import type { ExpenseCategory, PaymentMethod } from "../generated/prisma/enums.js";

// Every /finance/service/* mutation payload carries these — mirrors
// crm-automation.dto.ts's AutomationExecutionMetaDto (ADR-0019 Decisions 5 &
// 6: idempotency keyed on the n8n execution, contract versioning independent
// of the URL's /v1), applied to the Finance domain per ADR-0024. Declared
// per-domain rather than imported from the CRM file, matching this
// codebase's existing per-domain file convention (.context/finance.md,
// .context/crm.md) — revisit only if a third automation domain needs this
// factored into a shared module.
export interface AutomationExecutionMetaDto {
  contractVersion: string;
  workflowExecutionId: string;
  workflowName: string;
  durationMs?: number;
  errorMessage?: string;
}

// Channel-agnostic provenance — the field that keeps this endpoint reusable
// across every AI Finance Inbox front door (Slack today; Retell, Telegram,
// WhatsApp, OCR, Web Chat later), per the approved implementation plan.
// Nothing channel-specific (Slack channel IDs, thread timestamps) belongs
// here — only enough to identify who sent the message and where it came
// from.
export interface AutomationSourceDto {
  channel: "slack" | "telegram" | "whatsapp" | "retell" | "ocr" | "web-chat";
  externalUserId: string;
  externalMessageId?: string;
}

// CREATE_EXPENSE and UPLOAD_RECEIPT (once a handler has extracted
// expense-shaped fields from a receipt) both reach this one endpoint — see
// the AI Finance Inbox plan's intent -> endpoint mapping.
export type FinanceAutomationIntent = "CREATE_EXPENSE" | "UPLOAD_RECEIPT";

export interface CreateExpenseAutomatedDto extends AutomationExecutionMetaDto {
  date: string;
  amount: string;
  category: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  description?: string;
  isRecurring?: boolean;
  source: AutomationSourceDto;
  intent?: FinanceAutomationIntent;
}

export interface CategoriesResponseDto {
  categories: ExpenseCategory[];
  paymentMethods: PaymentMethod[];
}
