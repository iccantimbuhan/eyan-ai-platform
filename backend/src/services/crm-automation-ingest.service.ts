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
import { ALLOWED_TRANSITIONS } from "./crm-lead-transitions.js";
import {
  automationWebhookService,
  AutomationWebhookService,
} from "./automation-webhook.service.js";
import { logger } from "../lib/logger.js";
import type {
  ApplyQualificationResultDto,
  ApplyValidationResultDto,
  AssignLeadAutomatedDto,
  AutomationExecutionMetaDto,
} from "../dto/crm-automation.dto.js";
import type { EstimatedTimeline, LeadStatus } from "../generated/prisma/enums.js";
import { mapLeadToListItem } from "../dto/crm-lead.mapper.js";

// Phase 4 (Sprint 5) — confidence tier -> pipeline stage. Kept as a small
// lookup, not an if/else chain, so the mapping reads as configuration; the
// thresholds that produce the tier itself live in AiRoutingPolicy, not here.
const CONFIDENCE_TIER_PIPELINE_TARGET: Partial<Record<string, Extract<LeadStatus, "QUALIFIED" | "DISQUALIFIED">>> = {
  HIGH: "QUALIFIED",
  LOW: "DISQUALIFIED",
};

// Phase 5 (Sprint 5) — the AI's estimatedTimeline becomes a concrete
// follow-up window for the recommended-action Activity. No LeadActivity due
// -date column exists (and none is needed this sprint), so this is surfaced
// only in metadata for a rep/dashboard to read.
const FOLLOW_UP_DAYS_BY_TIMELINE: Record<EstimatedTimeline, number> = {
  IMMEDIATE: 0,
  SHORT_TERM: 3,
  MEDIUM_TERM: 14,
  LONG_TERM: 30,
  UNKNOWN: 7,
};

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
    private readonly executionLogRepository: WorkflowExecutionLogRepository = workflowExecutionLogRepository,
    private readonly webhookService: AutomationWebhookService = automationWebhookService
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

  // Workflow 3's write-back, now fed by a real AI Core capability invoke
  // (Sprint 5) rather than a stub payload. Beyond the original AI_ANALYZED
  // write, this also (Phase 4) auto-routes the pipeline by confidence tier,
  // (Phase 5) records a recommended-action Activity, and (Phase 6) fires
  // the lead.qualified webhook that triggers Workflow 4's sales automation.
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

    const lead = await this.persistAnalysisAndRoute(leadId, data);

    await this.recordExecution(data, leadId);

    return mapLeadToListItem(lead);
  }

  // Phase 7 — CrmLeadService.rerunQualification()'s target: a human
  // re-running AI qualification on a lead already qualified once (typically
  // one flagged for manual review). Reuses the exact same
  // analysis/routing/activity/webhook logic as the n8n write-back above
  // (persistAnalysisAndRoute), just gated by a different precondition —
  // "already qualified before" rather than "coming from VALIDATED for the
  // first time" — and its own WorkflowExecutionLog entry for audit parity.
  private static readonly RERUNNABLE_STATUSES: LeadStatus[] = [
    "AI_ANALYZED",
    "QUALIFIED",
    "DISQUALIFIED",
  ];

  async rerunQualification(leadId: string, data: ApplyQualificationResultDto) {
    const current = await this.getLeadOrThrow(leadId);

    if (!CrmAutomationIngestService.RERUNNABLE_STATUSES.includes(current.status)) {
      throw new InvalidLeadStatusTransitionError(current.status, "AI_ANALYZED");
    }

    const lead = await this.persistAnalysisAndRoute(leadId, data);

    await this.recordExecution(data, leadId);

    return mapLeadToListItem(lead);
  }

  // Shared by applyQualificationResult (n8n write-back) and
  // rerunQualification (human-triggered, Phase 7) — one code path for
  // "record a new LeadAiAnalysis and act on it," regardless of caller.
  private async persistAnalysisAndRoute(leadId: string, data: ApplyQualificationResultDto) {
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

    let lead = await this.leadRepository.updateQualification(leadId, {
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

    // Phase 4 — auto-route the pipeline by confidence tier. MEDIUM (or a
    // missing tier, e.g. an older caller that hasn't adopted the field yet)
    // deliberately stays at AI_ANALYZED — that status is itself the "needs
    // review" bucket the UI already renders needsManualReview against.
    const pipelineTarget = data.confidenceTier
      ? CONFIDENCE_TIER_PIPELINE_TARGET[data.confidenceTier]
      : undefined;

    if (pipelineTarget) {
      lead = await this.leadRepository.updateStatus(leadId, { status: pipelineTarget });

      await this.activityRepository.create({
        leadId,
        type: "STATUS_CHANGE",
        actorId: null,
        body: `Status changed from AI_ANALYZED to ${pipelineTarget} (automated — ${data.confidenceTier} confidence AI qualification).`,
        metadata: {
          from: "AI_ANALYZED",
          to: pipelineTarget,
          workflowExecutionId: data.workflowExecutionId,
          confidenceTier: data.confidenceTier,
        },
      });
    }

    // Phase 5 — one Activity capturing the AI's concrete next step,
    // separate from the AI_ANALYSIS note above (that one records that
    // analysis happened; this one is the actionable recommendation itself).
    const followUpDays = data.estimatedTimeline
      ? FOLLOW_UP_DAYS_BY_TIMELINE[data.estimatedTimeline]
      : FOLLOW_UP_DAYS_BY_TIMELINE.UNKNOWN;

    await this.activityRepository.create({
      leadId,
      type: "AUTOMATION",
      actorId: null,
      body: `Recommended: ${data.recommendedAction}`,
      metadata: {
        workflowExecutionId: data.workflowExecutionId,
        estimatedTimeline: data.estimatedTimeline ?? "UNKNOWN",
        followUpDueInDays: followUpDays,
      },
    });

    // Phase 6 — hands off to Workflow 4 (sales automation) now that the
    // lead has already been fully updated backend-side; fire-and-forget,
    // same reasoning as dispatchLeadIntake (must never fail this write-back).
    void this.webhookService.dispatchLeadQualified(lead, data, lead.status);

    return lead;
  }

  // Workflow 4's "assign salesperson" write-back (Sprint 5, Phase 6) — a
  // separate n8n-triggered mutation, not a status transition, so it doesn't
  // touch ALLOWED_TRANSITIONS. Mirrors CrmLeadService.assign()'s shape
  // (ASSIGNMENT activity) but with a null actorId and the same
  // idempotency/execution-log contract as this class's other two methods.
  async assignLead(leadId: string, data: AssignLeadAutomatedDto) {
    const replay = await this.findCompletedExecution(data.workflowName, data.workflowExecutionId);

    if (replay) {
      logger.debug(
        `[CrmAutomationIngestService] Replayed execution ${data.workflowExecutionId} (${data.workflowName}) — no-op.`
      );

      return mapLeadToListItem(await this.getLeadOrThrow(leadId));
    }

    const current = await this.getLeadOrThrow(leadId);

    const lead = await this.leadRepository.updateAssignment(leadId, data.assignedToId);

    await this.activityRepository.create({
      leadId,
      type: "ASSIGNMENT",
      actorId: null,
      body: "Lead assigned (automated).",
      metadata: {
        from: current.assignedToId,
        to: data.assignedToId,
        workflowExecutionId: data.workflowExecutionId,
      },
    });

    await this.recordExecution(data, leadId);

    return mapLeadToListItem(lead);
  }
}

export const crmAutomationIngestService = new CrmAutomationIngestService();
