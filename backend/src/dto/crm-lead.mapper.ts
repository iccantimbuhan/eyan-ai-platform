import type {
  Lead,
  LeadActivity,
  LeadAiAnalysis,
  WorkflowExecutionLog,
} from "../generated/prisma/client.js";
import type {
  LeadActivityResponseDto,
  LeadAiAnalysisResponseDto,
  LeadDetailResponseDto,
  LeadListItemResponseDto,
  WorkflowExecutionLogResponseDto,
} from "./crm-lead.dto.js";

export function mapLeadToListItem(row: Lead): LeadListItemResponseDto {
  return {
    id: row.id,
    source: row.source,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    company: row.company,
    industry: row.industry,
    companySize: row.companySize,
    status: row.status,
    score: row.score,
    priority: row.priority,
    assignedToId: row.assignedToId,
    lostReason: row.lostReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapActivityToResponse(row: LeadActivity): LeadActivityResponseDto {
  return {
    id: row.id,
    leadId: row.leadId,
    type: row.type,
    actorId: row.actorId,
    body: row.body,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

// .toFixed(2) on the Decimal boundary, same reasoning as
// finance-expense.mapper.ts — never .toString(), which drops trailing
// zeros and would misrepresent a budget estimate.
export function mapAiAnalysisToResponse(row: LeadAiAnalysis): LeadAiAnalysisResponseDto {
  return {
    id: row.id,
    leadId: row.leadId,
    provider: row.provider,
    model: row.model,
    promptVersion: row.promptVersion,
    leadScore: row.leadScore,
    confidence: row.confidence,
    priority: row.priority,
    industry: row.industry,
    companySizeEstimate: row.companySizeEstimate,
    budgetEstimateMin: row.budgetEstimateMin ? row.budgetEstimateMin.toFixed(2) : null,
    budgetEstimateMax: row.budgetEstimateMax ? row.budgetEstimateMax.toFixed(2) : null,
    budgetEstimateCurrency: row.budgetEstimateCurrency,
    buyingIntent: row.buyingIntent,
    urgency: row.urgency,
    decisionMakerIdentified: row.decisionMakerIdentified,
    estimatedTimeline: row.estimatedTimeline,
    riskLevel: row.riskLevel,
    painPoints: row.painPoints,
    recommendedAction: row.recommendedAction,
    summary: row.summary,
    reasoning: row.reasoning,
    needsManualReview: row.needsManualReview,
    createdAt: row.createdAt,
  };
}

export function mapExecutionLogToResponse(
  row: WorkflowExecutionLog
): WorkflowExecutionLogResponseDto {
  return {
    id: row.id,
    domain: row.domain,
    workflowName: row.workflowName,
    leadId: row.leadId,
    n8nExecutionId: row.n8nExecutionId,
    status: row.status,
    durationMs: row.durationMs,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
  };
}

export function mapLeadToDetail(
  row: Lead & {
    activities: LeadActivity[];
    aiAnalyses: LeadAiAnalysis[];
    executionLogs: WorkflowExecutionLog[];
  }
): LeadDetailResponseDto {
  return {
    ...mapLeadToListItem(row),
    activities: row.activities.map(mapActivityToResponse),
    aiAnalyses: row.aiAnalyses.map(mapAiAnalysisToResponse),
    executionLogs: row.executionLogs.map(mapExecutionLogToResponse),
  };
}
