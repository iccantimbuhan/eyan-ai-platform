import type {
  EstimatedTimeline,
  LeadPriority,
  LeadStatus,
  QualificationLevel,
} from "../generated/prisma/enums.js";

// Every /crm/service/* mutation payload carries these — ADR-0019 Decision 5
// (idempotency, keyed on the n8n execution) and Decision 6 (contract
// versioning independent of the URL's /v1).
export interface AutomationExecutionMetaDto {
  contractVersion: string;
  workflowExecutionId: string;
  workflowName: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface DedupeLeadQueryDto {
  email: string;
}

// Workflow 4's "assign salesperson" write-back (Sprint 5, Phase 6) — same
// idempotency contract as the other two /crm/service/leads/:id/* mutations.
export interface AssignLeadAutomatedDto extends AutomationExecutionMetaDto {
  assignedToId: string;
}

// Workflow 2 (Validation) write-back — only VALIDATED/DISQUALIFIED are
// legal targets from NEW; CrmLeadService's own ALLOWED_TRANSITIONS map is
// still the authority that enforces this, not the validator.
export interface ApplyValidationResultDto extends AutomationExecutionMetaDto {
  status: Extract<LeadStatus, "VALIDATED" | "DISQUALIFIED">;
}

// Workflow 3/4's future real write-back shape, exercised this sprint with a
// dummy/stub payload (TDD Sprint 2: "AI step stubbed with a fixed dummy
// score") — matches the frozen AI JSON schema (TDD §14) plus execution
// metadata. Building this endpoint is not "implementing AI": it is the
// receiving contract for whatever produces a qualification result,
// verified here with a stand-in payload.
export interface ApplyQualificationResultDto extends AutomationExecutionMetaDto {
  provider: string;
  model: string;
  promptVersion: string;
  leadScore: number;
  confidence: number;
  priority: LeadPriority;
  industry?: string;
  companySizeEstimate?: string;
  budgetEstimateMin?: number;
  budgetEstimateMax?: number;
  budgetEstimateCurrency?: string;
  // "UNKNOWN" is not a QualificationLevel enum member (DB column only
  // stores LOW/MEDIUM/HIGH) — a real model output legitimately returns it
  // when there's not enough signal to classify (mirrors EstimatedTimeline's
  // own UNKNOWN member). Accepted here, normalized to null before the
  // Prisma write (see CrmAutomationIngestService.persistAnalysisAndRoute).
  buyingIntent?: QualificationLevel | "UNKNOWN";
  urgency?: QualificationLevel | "UNKNOWN";
  decisionMakerIdentified?: boolean;
  estimatedTimeline?: EstimatedTimeline;
  riskLevel?: QualificationLevel | "UNKNOWN";
  painPoints?: string[];
  recommendedAction: string;
  summary: string;
  reasoning: string;
  needsManualReview?: boolean;
  confidenceTier?: QualificationLevel;
}
