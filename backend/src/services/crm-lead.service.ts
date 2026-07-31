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
import { paginate } from "../utils/pagination.js";
import {
  automationWebhookService,
  AutomationWebhookService,
} from "./automation-webhook.service.js";
import type { LeadStatus } from "../generated/prisma/enums.js";
import type {
  AssignLeadDto,
  CreateLeadDto,
  CreateLeadNoteDto,
  ListLeadsQueryDto,
  UpdateLeadDto,
  UpdateLeadStatusDto,
} from "../dto/crm-lead.dto.js";
import { mapLeadToDetail, mapLeadToListItem } from "../dto/crm-lead.mapper.js";

// Server-enforced lifecycle (TDD §8) — the only place that decides which
// status transitions are legal. NEW can only reach DISQUALIFIED directly;
// LOST is reachable from VALIDATED onward, never from NEW ("never became a
// real lead" is DISQUALIFIED's job, distinct from "was real, didn't
// convert"). CONVERTED/LOST/DISQUALIFIED are terminal.
export const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["VALIDATED", "DISQUALIFIED"],
  VALIDATED: ["AI_ANALYZED", "LOST"],
  DISQUALIFIED: [],
  AI_ANALYZED: ["QUALIFIED", "LOST"],
  QUALIFIED: ["CONTACTED", "LOST"],
  CONTACTED: ["NEGOTIATION", "LOST"],
  NEGOTIATION: ["CONVERTED", "LOST"],
  CONVERTED: [],
  LOST: [],
};

export class CrmLeadService {
  constructor(
    private readonly repository: CrmLeadRepository = crmLeadRepository,
    private readonly activityRepository: CrmLeadActivityRepository = crmLeadActivityRepository,
    private readonly webhookService: AutomationWebhookService = automationWebhookService
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
}

export const crmLeadService = new CrmLeadService();
