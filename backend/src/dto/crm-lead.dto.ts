import type { LeadPriority, LeadSource, LeadStatus } from "../generated/prisma/enums.js";

// Public payload — anything the Lead Form submits. Only contactName/email
// are required; everything else is optional so the form stays short.
// Unknown extra fields are still captured verbatim in Lead.rawSubmission by
// the service, not dropped here.
export interface CreateLeadDto {
  contactName: string;
  email: string;
  phone?: string;
  company?: string;
  industry?: string;
  companySize?: string;
  [key: string]: unknown;
}

// Editable contact/business fields only — status, score, priority, and
// assignment each go through their own dedicated endpoint because they're
// lifecycle-controlled, not free-form edits (TDD §8).
export interface UpdateLeadDto {
  contactName?: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  companySize?: string;
}

export interface UpdateLeadStatusDto {
  status: LeadStatus;
  priority?: LeadPriority;
  lostReason?: string;
}

export interface AssignLeadDto {
  assignedToId: string | null;
}

export interface CreateLeadNoteDto {
  body: string;
}

export interface ListLeadsQueryDto {
  page?: number;
  pageSize?: number;
  status?: LeadStatus;
  priority?: LeadPriority;
  assignedToId?: string;
  search?: string;
  sortBy?: "createdAt" | "score" | "contactName";
  sortDir?: "asc" | "desc";
}

export interface LeadListItemResponseDto {
  id: string;
  source: LeadSource;
  contactName: string;
  email: string;
  phone: string | null;
  company: string | null;
  industry: string | null;
  companySize: string | null;
  status: LeadStatus;
  score: number | null;
  priority: LeadPriority | null;
  assignedToId: string | null;
  lostReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivityResponseDto {
  id: string;
  leadId: string;
  type: string;
  actorId: string | null;
  body: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface LeadAiAnalysisResponseDto {
  id: string;
  leadId: string;
  provider: string;
  model: string;
  promptVersion: string;
  leadScore: number;
  confidence: number;
  priority: LeadPriority;
  industry: string | null;
  companySizeEstimate: string | null;
  budgetEstimateMin: string | null;
  budgetEstimateMax: string | null;
  budgetEstimateCurrency: string | null;
  buyingIntent: string | null;
  urgency: string | null;
  decisionMakerIdentified: boolean | null;
  estimatedTimeline: string | null;
  riskLevel: string | null;
  painPoints: string[];
  recommendedAction: string;
  summary: string;
  reasoning: string;
  needsManualReview: boolean;
  createdAt: Date;
}

export interface WorkflowExecutionLogResponseDto {
  id: string;
  domain: string;
  workflowName: string;
  leadId: string | null;
  n8nExecutionId: string | null;
  status: string;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface LeadDetailResponseDto extends LeadListItemResponseDto {
  activities: LeadActivityResponseDto[];
  aiAnalyses: LeadAiAnalysisResponseDto[];
  executionLogs: WorkflowExecutionLogResponseDto[];
}
