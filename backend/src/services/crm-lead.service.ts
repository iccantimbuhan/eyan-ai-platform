import { randomUUID } from "node:crypto";

import {
  crmLeadRepository,
  CrmLeadRepository,
} from "../repositories/crm-lead.repository.js";
import {
  crmLeadActivityRepository,
  CrmLeadActivityRepository,
} from "../repositories/crm-lead-activity.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { InvalidLeadStatusTransitionError } from "../errors/crm.error.js";
import { ApiError } from "../errors/api-error.js";
import { paginate } from "../utils/pagination.js";
import {
  automationWebhookService,
  AutomationWebhookService,
} from "./automation-webhook.service.js";
import {
  crmAutomationIngestService,
  CrmAutomationIngestService,
} from "./crm-automation-ingest.service.js";
import { aiCapabilityService, AiCapabilityService } from "./ai-capability.service.js";
import { ALLOWED_TRANSITIONS } from "./crm-lead-transitions.js";
import type { ApplyQualificationResultDto } from "../dto/crm-automation.dto.js";
import type {
  AssignLeadDto,
  CreateLeadDto,
  CreateLeadNoteDto,
  ListLeadsQueryDto,
  UpdateLeadDto,
  UpdateLeadStatusDto,
} from "../dto/crm-lead.dto.js";
import { mapLeadToDetail, mapLeadToListItem } from "../dto/crm-lead.mapper.js";

// Shape of lead-qualification's frozen JSON schema (see
// eyan-automation-hub/workflows/crm/prompts/lead-qualification.v1.md) —
// AiInvokeResult.outputJson is `unknown` by design (AI Core is
// capability-agnostic), so this is where the CRM-side contract for this one
// Capability's output lives, same as ApplyQualificationResultDto's fields.
interface LeadQualificationOutput {
  leadScore: number;
  confidence: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  industry?: string;
  companySizeEstimate?: string;
  budgetEstimate?: { min: number; max: number; currency: string } | null;
  buyingIntent?: "LOW" | "MEDIUM" | "HIGH";
  urgency?: "LOW" | "MEDIUM" | "HIGH";
  decisionMakerIdentified?: boolean;
  estimatedTimeline?: "IMMEDIATE" | "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM" | "UNKNOWN";
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  painPoints?: string[];
  recommendedAction: string;
  summary: string;
  reasoning: string;
}

// Re-exported for backward compatibility — the transition table itself now
// lives in crm-lead-transitions.ts (Sprint 5), so CrmAutomationIngestService
// can depend on it without creating a circular import with this module (this
// file now also imports CrmAutomationIngestService, for rerunQualification).
export { ALLOWED_TRANSITIONS } from "./crm-lead-transitions.js";

export class CrmLeadService {
  constructor(
    private readonly repository: CrmLeadRepository = crmLeadRepository,
    private readonly activityRepository: CrmLeadActivityRepository = crmLeadActivityRepository,
    private readonly webhookService: AutomationWebhookService = automationWebhookService,
    private readonly automationIngestService: CrmAutomationIngestService = crmAutomationIngestService,
    private readonly capabilityService: AiCapabilityService = aiCapabilityService
  ) {}

  // F2 (TDD): lead creation triggers n8n's Workflow 1 asynchronously — the
  // dispatch is fire-and-forget (see AutomationWebhookService), never
  // awaited here, so a slow/unreachable Automation Hub can never delay or
  // fail the Lead Form's response (NFR: response must return immediately).
  async create(data: CreateLeadDto) {
    const { contactName, email, phone, company, industry, companySize, ...rest } = data;

    const lead = await this.repository.create({
      source: "WEBSITE_FORM",
      contactName,
      email,
      phone: phone ?? null,
      company: company ?? null,
      industry: industry ?? null,
      companySize: companySize ?? null,
      rawSubmission: { contactName, email, phone, company, industry, companySize, ...rest },
    });

    void this.webhookService.dispatchLeadIntake(lead);

    return mapLeadToListItem(lead);
  }

  async list(query: ListLeadsQueryDto = {}) {
    const { page, pageSize, skip, take } = paginate({
      page: query.page,
      pageSize: query.pageSize,
    });

    const filters = {
      status: query.status,
      priority: query.priority,
      assignedToId: query.assignedToId,
      search: query.search,
    };

    const [items, total] = await Promise.all([
      this.repository.findMany({
        skip,
        take,
        sortBy: query.sortBy ?? "createdAt",
        sortDir: query.sortDir ?? "desc",
        ...filters,
      }),
      this.repository.count(filters),
    ]);

    return {
      items: items.map(mapLeadToListItem),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: string) {
    const lead = await this.repository.findById(id);

    if (!lead) {
      throw new NotFoundError("Lead not found.");
    }

    return mapLeadToDetail(lead);
  }

  private async getLeadOrThrow(id: string) {
    const lead = await this.repository.findById(id);

    if (!lead) {
      throw new NotFoundError("Lead not found.");
    }

    return lead;
  }

  async update(id: string, data: UpdateLeadDto) {
    await this.getLeadOrThrow(id);

    const lead = await this.repository.updateFields(id, data);

    return mapLeadToListItem(lead);
  }

  // Status changes are never fire-and-forget: the activity write is awaited
  // and its failure propagates (unlike Finance's best-effort audit log) —
  // IMPLEMENTATION_RULES.md's "nothing changes silently" applies to
  // LeadActivity directly, since it's the user-visible timeline, not
  // supplementary metadata. No DB transaction spans the two writes yet
  // (no cross-repository unit-of-work exists in this codebase) — acceptable
  // for v1's low write-concurrency; see Sprint 1 completion report.
  async updateStatus(id: string, data: UpdateLeadStatusDto, actorId: string) {
    const current = await this.getLeadOrThrow(id);

    const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];

    if (!allowed.includes(data.status)) {
      throw new InvalidLeadStatusTransitionError(current.status, data.status);
    }

    const lead = await this.repository.updateStatus(id, {
      status: data.status,
      priority: data.priority,
      lostReason: data.status === "LOST" ? (data.lostReason ?? null) : current.lostReason,
    });

    await this.activityRepository.create({
      leadId: id,
      type: "STATUS_CHANGE",
      actorId,
      body: `Status changed from ${current.status} to ${data.status}.`,
      metadata: { from: current.status, to: data.status },
    });

    return mapLeadToListItem(lead);
  }

  async assign(id: string, data: AssignLeadDto, actorId: string) {
    const current = await this.getLeadOrThrow(id);

    const lead = await this.repository.updateAssignment(id, data.assignedToId);

    await this.activityRepository.create({
      leadId: id,
      type: "ASSIGNMENT",
      actorId,
      body: data.assignedToId ? "Lead assigned." : "Lead unassigned.",
      metadata: { from: current.assignedToId, to: data.assignedToId },
    });

    return mapLeadToListItem(lead);
  }

  async addNote(id: string, data: CreateLeadNoteDto, actorId: string) {
    await this.getLeadOrThrow(id);

    await this.activityRepository.create({
      leadId: id,
      type: "NOTE",
      actorId,
      body: data.body,
    });

    return this.getById(id);
  }

  // Phase 7 (Manual Review Queue) — the human-triggered counterpart to
  // Workflow 3's write-back, calling AI Core in-process (same pattern
  // ContentService already uses, ADR-0021 Phase 2) rather than round-
  // tripping through n8n for something a rep asked for synchronously. The
  // actual persistence (LeadAiAnalysis, pipeline routing, Activities,
  // Workflow 4 dispatch) is delegated to CrmAutomationIngestService so both
  // this path and the n8n path share one implementation.
  async rerunQualification(id: string, actorId: string) {
    const lead = await this.getLeadOrThrow(id);

    const result = await this.capabilityService.invoke(
      "lead-qualification",
      {
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        industry: lead.industry,
        companySize: lead.companySize,
        source: lead.source,
        createdAt: lead.createdAt.toISOString(),
      },
      { expectJson: true, workflowName: "manual-rerun" },
      actorId
    );

    if (result.outcome !== "VALID" || !result.outputJson) {
      throw new ApiError(503, "AI qualification did not return a usable result.");
    }

    const output = result.outputJson as LeadQualificationOutput;

    const dto: ApplyQualificationResultDto = {
      contractVersion: "1",
      workflowExecutionId: randomUUID(),
      workflowName: "manual-rerun",
      provider: result.provider,
      model: result.model,
      promptVersion: result.promptVersion,
      leadScore: output.leadScore,
      confidence: output.confidence,
      priority: output.priority,
      industry: output.industry,
      companySizeEstimate: output.companySizeEstimate,
      budgetEstimateMin: output.budgetEstimate?.min,
      budgetEstimateMax: output.budgetEstimate?.max,
      budgetEstimateCurrency: output.budgetEstimate?.currency,
      buyingIntent: output.buyingIntent,
      urgency: output.urgency,
      decisionMakerIdentified: output.decisionMakerIdentified,
      estimatedTimeline: output.estimatedTimeline,
      riskLevel: output.riskLevel,
      painPoints: output.painPoints,
      recommendedAction: output.recommendedAction,
      summary: output.summary,
      reasoning: output.reasoning,
      needsManualReview: result.needsManualReview,
      confidenceTier: result.confidence ?? undefined,
    };

    return this.automationIngestService.rerunQualification(id, dto);
  }
}

export const crmLeadService = new CrmLeadService();
