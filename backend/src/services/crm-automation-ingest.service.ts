import {
  crmLeadRepository,
  CrmLeadRepository,
} from "../repositories/crm-lead.repository.js";
import {
  crmLeadActivityRepository,
  CrmLeadActivityRepository,
} from "../repositories/crm-lead-activity.repository.js";
import {
  crmAiAnalysisRepository,
  CrmAiAnalysisRepository,
} from "../repositories/crm-ai-analysis.repository.js";
import {
  workflowExecutionLogRepository,
  WorkflowExecutionLogRepository,
} from "../repositories/workflow-execution-log.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { InvalidLeadStatusTransitionError } from "../errors/crm.error.js";
import { ALLOWED_TRANSITIONS } from "./crm-lead.service.js";
import { logger } from "../lib/logger.js";
import type {
  ApplyQualificationResultDto,
  ApplyValidationResultDto,
  AutomationExecutionMetaDto,
} from "../dto/crm-automation.dto.js";
import { mapLeadToListItem } from "../dto/crm-lead.mapper.js";

// n8n write-back surface (TDD §9) — kept separate from CrmLeadService
// (user-facing CRUD) since the two have different callers, different auth,
// and different idempotency requirements (ADR-0019), even though both sit
// on top of the same Lead/LeadActivity data. ALLOWED_TRANSITIONS is
// imported, not duplicated, from CrmLeadService — one lifecycle authority
// regardless of which side triggers a transition.
export class CrmAutomationIngestService {
  constructor(
    private readonly leadRepository: CrmLeadRepository = crmLeadRepository,
    private readonly activityRepository: CrmLeadActivityRepository = crmLeadActivityRepository,
    private readonly aiAnalysisRepository: CrmAiAnalysisRepository = crmAiAnalysisRepository,
    private readonly executionLogRepository: WorkflowExecutionLogRepository = workflowExecutionLogRepository
  ) {}

  // Workflow 2's dedupe check (TDD §10: `GET /crm/service/leads?email=`).
  async findByEmail(email: string) {
    const lead = await this.leadRepository.findByEmail(email);

    return lead ? mapLeadToListItem(lead) : null;
  }

  private async getLeadOrThrow(id: string) {
    const lead = await this.leadRepository.findById(id);

    if (!lead) {
      throw new NotFoundError("Lead not found.");
    }

    return lead;
  }

  // ADR-0019 Decision 5 — a repeated call carrying an already-succeeded
  // workflowExecutionId is a safe replay, not a new mutation.
  private async findCompletedExecution(workflowName: string, workflowExecutionId: string) {
    const existing = await this.executionLogRepository.findByExecutionId(
      workflowName,
      workflowExecutionId
    );

    return existing?.status === "SUCCESS" ? existing : null;
  }

  private async recordExecution(meta: AutomationExecutionMetaDto, leadId: string) {
    await this.executionLogRepository.create({
      domain: "crm",
      workflowName: meta.workflowName,
      leadId,
      n8nExecutionId: meta.workflowExecutionId,
      status: "SUCCESS",
      durationMs: meta.durationMs ?? null,
      errorMessage: meta.errorMessage ?? null,
    });
  }

  async applyValidationResult(leadId: string, data: ApplyValidationResultDto) {
    const replay = await this.findCompletedExecution(data.workflowName, data.workflowExecutionId);

    if (replay) {
      logger.debug(
        `[CrmAutomationIngestService] Replayed execution ${data.workflowExecutionId} (${data.workflowName}) — no-op.`
      );

      return mapLeadToListItem(await this.getLeadOrThrow(leadId));
    }

    const current = await this.getLeadOrThrow(leadId);

    const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];

    if (!allowed.includes(data.status)) {
      throw new InvalidLeadStatusTransitionError(current.status, data.status);
    }

    const lead = await this.leadRepository.updateStatus(leadId, { status: data.status });

    await this.activityRepository.create({
      leadId,
      type: "STATUS_CHANGE",
      actorId: null,
      body: `Status changed from ${current.status} to ${data.status} (automated — ${data.workflowName}).`,
      metadata: {
        from: current.status,
        to: data.status,
        workflowExecutionId: data.workflowExecutionId,
      },
    });

    await this.recordExecution(data, leadId);

    return mapLeadToListItem(lead);
  }

  // Stands in for Workflow 3+4's combined write-back this sprint — accepts
  // a dummy/stub qualification payload (real AI orchestration is Sprint 3),
  // but persists it through the exact same contract Workflow 3 will use.
  async applyQualificationResult(leadId: string, data: ApplyQualificationResultDto) {
    const replay = await this.findCompletedExecution(data.workflowName, data.workflowExecutionId);

    if (replay) {
      logger.debug(
        `[CrmAutomationIngestService] Replayed execution ${data.workflowExecutionId} (${data.workflowName}) — no-op.`
      );

      return mapLeadToListItem(await this.getLeadOrThrow(leadId));
    }

    const current = await this.getLeadOrThrow(leadId);

    const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];

    if (!allowed.includes("AI_ANALYZED")) {
      throw new InvalidLeadStatusTransitionError(current.status, "AI_ANALYZED");
    }

    await this.aiAnalysisRepository.create({
      leadId,
      provider: data.provider,
      model: data.model,
      promptVersion: data.promptVersion,
      leadScore: data.leadScore,
      confidence: data.confidence,
      priority: data.priority,
      industry: data.industry ?? null,
      companySizeEstimate: data.companySizeEstimate ?? null,
      budgetEstimateMin: data.budgetEstimateMin ?? null,
      budgetEstimateMax: data.budgetEstimateMax ?? null,
      budgetEstimateCurrency: data.budgetEstimateCurrency ?? null,
      buyingIntent: data.buyingIntent ?? null,
      urgency: data.urgency ?? null,
      decisionMakerIdentified: data.decisionMakerIdentified ?? null,
      estimatedTimeline: data.estimatedTimeline ?? null,
      riskLevel: data.riskLevel ?? null,
      painPoints: data.painPoints ?? [],
      recommendedAction: data.recommendedAction,
      summary: data.summary,
      reasoning: data.reasoning,
      rawResponse: { ...data },
      needsManualReview: data.needsManualReview ?? false,
    });

    const lead = await this.leadRepository.updateQualification(leadId, {
      status: "AI_ANALYZED",
      score: data.leadScore,
      priority: data.priority,
    });

    await this.activityRepository.create({
      leadId,
      type: "AI_ANALYSIS",
      actorId: null,
      body: data.needsManualReview
        ? "AI analysis complete — flagged for manual review."
        : "AI analysis complete.",
      metadata: {
        workflowExecutionId: data.workflowExecutionId,
        confidence: data.confidence,
        leadScore: data.leadScore,
      },
    });

    await this.recordExecution(data, leadId);

    return mapLeadToListItem(lead);
  }
}

export const crmAutomationIngestService = new CrmAutomationIngestService();
