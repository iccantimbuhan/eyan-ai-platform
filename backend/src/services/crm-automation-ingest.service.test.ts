import { describe, expect, it, vi } from "vitest";

import { CrmAutomationIngestService } from "./crm-automation-ingest.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { InvalidLeadStatusTransitionError } from "../errors/crm.error.js";

function leadRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "lead-1",
    source: "WEBSITE_FORM",
    contactName: "Jane Doe",
    email: "jane@example.com",
    phone: null,
    company: "Acme",
    industry: null,
    companySize: null,
    status: "NEW",
    score: null,
    priority: null,
    assignedToId: null,
    lostReason: null,
    rawSubmission: {},
    activities: [],
    aiAnalyses: [],
    executionLogs: [],
    createdAt: new Date(2026, 6, 15),
    updatedAt: new Date(2026, 6, 15),
    ...overrides,
  };
}

function createLeadRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(leadRow()),
    findByEmail: vi.fn().mockResolvedValue(null),
    updateStatus: vi.fn().mockResolvedValue(leadRow({ status: "VALIDATED" })),
    updateQualification: vi.fn().mockResolvedValue(leadRow({ status: "AI_ANALYZED", score: 72 })),
    updateAssignment: vi.fn().mockResolvedValue(leadRow({ assignedToId: "user-2" })),
    ...overrides,
  };
}

function createActivityRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { create: vi.fn().mockResolvedValue({}), ...overrides };
}

function createAiAnalysisRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { create: vi.fn().mockResolvedValue({}), ...overrides };
}

function createExecutionLogRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findByExecutionId: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createWebhookService(overrides: Partial<Record<string, unknown>> = {}) {
  return { dispatchLeadQualified: vi.fn().mockResolvedValue(undefined), ...overrides };
}

const BASE_VALIDATION_META = {
  contractVersion: "1",
  workflowExecutionId: "exec-1",
  workflowName: "02-validation",
};

const BASE_QUALIFICATION_PAYLOAD = {
  contractVersion: "1",
  workflowExecutionId: "exec-2",
  workflowName: "03-ai-qualification",
  provider: "ollama",
  model: "qwen2.5-coder:7b",
  promptVersion: "v1",
  leadScore: 72,
  confidence: 0.5,
  priority: "MEDIUM" as const,
  recommendedAction: "Follow up",
  summary: "Dummy summary",
  reasoning: "Dummy reasoning",
};

function buildService(overrides: {
  leadRepository?: ReturnType<typeof createLeadRepository>;
  activityRepository?: ReturnType<typeof createActivityRepository>;
  aiAnalysisRepository?: ReturnType<typeof createAiAnalysisRepository>;
  executionLogRepository?: ReturnType<typeof createExecutionLogRepository>;
  webhookService?: ReturnType<typeof createWebhookService>;
} = {}) {
  return new CrmAutomationIngestService(
    (overrides.leadRepository ?? createLeadRepository()) as never,
    (overrides.activityRepository ?? createActivityRepository()) as never,
    (overrides.aiAnalysisRepository ?? createAiAnalysisRepository()) as never,
    (overrides.executionLogRepository ?? createExecutionLogRepository()) as never,
    (overrides.webhookService ?? createWebhookService()) as never
  );
}

describe("CrmAutomationIngestService", () => {
  describe("findByEmail", () => {
    it("returns null when no lead matches (the expected common case for a dedupe check)", async () => {
      const service = buildService();

      const result = await service.findByEmail("nobody@example.com");

      expect(result).toBeNull();
    });

    it("returns the mapped lead when found", async () => {
      const leadRepository = createLeadRepository({
        findByEmail: vi.fn().mockResolvedValue(leadRow()),
      });
      const service = buildService({ leadRepository });

      const result = await service.findByEmail("jane@example.com");

      expect(result?.id).toBe("lead-1");
    });
  });

  describe("applyValidationResult", () => {
    it("applies NEW -> VALIDATED, records a system-actor STATUS_CHANGE activity, and logs the execution", async () => {
      const leadRepository = createLeadRepository();
      const activityRepository = createActivityRepository();
      const executionLogRepository = createExecutionLogRepository();
      const service = buildService({ leadRepository, activityRepository, executionLogRepository });

      await service.applyValidationResult("lead-1", { ...BASE_VALIDATION_META, status: "VALIDATED" });

      expect(leadRepository.updateStatus).toHaveBeenCalledWith("lead-1", { status: "VALIDATED" });
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: "lead-1", type: "STATUS_CHANGE", actorId: null })
      );
      expect(executionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: "crm",
          workflowName: "02-validation",
          n8nExecutionId: "exec-1",
          status: "SUCCESS",
        })
      );
    });

    it("rejects an illegal transition (NEW -> DISQUALIFIED is legal, but a QUALIFIED lead can't be re-validated)", async () => {
      const leadRepository = createLeadRepository({
        findById: vi.fn().mockResolvedValue(leadRow({ status: "QUALIFIED" })),
      });
      const service = buildService({ leadRepository });

      await expect(
        service.applyValidationResult("lead-1", { ...BASE_VALIDATION_META, status: "VALIDATED" })
      ).rejects.toThrow(InvalidLeadStatusTransitionError);

      expect(leadRepository.updateStatus).not.toHaveBeenCalled();
    });

    it("throws NotFoundError for a missing lead", async () => {
      const leadRepository = createLeadRepository({ findById: vi.fn().mockResolvedValue(null) });
      const service = buildService({ leadRepository });

      await expect(
        service.applyValidationResult("missing", { ...BASE_VALIDATION_META, status: "VALIDATED" })
      ).rejects.toThrow(NotFoundError);
    });

    it("is idempotent — a replayed workflowExecutionId with a prior SUCCESS is a no-op, not a re-applied transition", async () => {
      const leadRepository = createLeadRepository();
      const executionLogRepository = createExecutionLogRepository({
        findByExecutionId: vi.fn().mockResolvedValue({ status: "SUCCESS" }),
      });
      const service = buildService({ leadRepository, executionLogRepository });

      const result = await service.applyValidationResult("lead-1", {
        ...BASE_VALIDATION_META,
        status: "VALIDATED",
      });

      expect(leadRepository.updateStatus).not.toHaveBeenCalled();
      expect(result.id).toBe("lead-1");
    });
  });

  describe("applyQualificationResult", () => {
    it("applies VALIDATED -> AI_ANALYZED, persists a LeadAiAnalysis row, and records an AI_ANALYSIS activity", async () => {
      const leadRepository = createLeadRepository({
        findById: vi.fn().mockResolvedValue(leadRow({ status: "VALIDATED" })),
      });
      const activityRepository = createActivityRepository();
      const aiAnalysisRepository = createAiAnalysisRepository();
      const executionLogRepository = createExecutionLogRepository();
      const service = buildService({
        leadRepository,
        activityRepository,
        aiAnalysisRepository,
        executionLogRepository,
      });

      await service.applyQualificationResult("lead-1", BASE_QUALIFICATION_PAYLOAD);

      expect(aiAnalysisRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: "lead-1", leadScore: 72, provider: "ollama" })
      );
      expect(leadRepository.updateQualification).toHaveBeenCalledWith("lead-1", {
        status: "AI_ANALYZED",
        score: 72,
        priority: "MEDIUM",
      });
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: "lead-1", type: "AI_ANALYSIS", actorId: null })
      );
      expect(executionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ workflowName: "03-ai-qualification", status: "SUCCESS" })
      );
    });

    it("rejects qualification for a lead not yet VALIDATED", async () => {
      const leadRepository = createLeadRepository({
        findById: vi.fn().mockResolvedValue(leadRow({ status: "NEW" })),
      });
      const service = buildService({ leadRepository });

      await expect(
        service.applyQualificationResult("lead-1", BASE_QUALIFICATION_PAYLOAD)
      ).rejects.toThrow(InvalidLeadStatusTransitionError);

      expect(leadRepository.updateQualification).not.toHaveBeenCalled();
    });

    it("is idempotent — a replayed workflowExecutionId does not create a second LeadAiAnalysis row", async () => {
      const leadRepository = createLeadRepository({
        findById: vi.fn().mockResolvedValue(leadRow({ status: "AI_ANALYZED", score: 72 })),
      });
      const aiAnalysisRepository = createAiAnalysisRepository();
      const executionLogRepository = createExecutionLogRepository({
        findByExecutionId: vi.fn().mockResolvedValue({ status: "SUCCESS" }),
      });
      const service = buildService({ leadRepository, aiAnalysisRepository, executionLogRepository });

      await service.applyQualificationResult("lead-1", BASE_QUALIFICATION_PAYLOAD);

      expect(aiAnalysisRepository.create).not.toHaveBeenCalled();
      expect(leadRepository.updateQualification).not.toHaveBeenCalled();
    });

    it("HIGH confidence auto-routes AI_ANALYZED -> QUALIFIED and records a second STATUS_CHANGE activity", async () => {
      const leadRepository = createLeadRepository({
        findById: vi.fn().mockResolvedValue(leadRow({ status: "VALIDATED" })),
        updateStatus: vi.fn().mockResolvedValue(leadRow({ status: "QUALIFIED", score: 92 })),
      });
      const activityRepository = createActivityRepository();
      const service = buildService({ leadRepository, activityRepository });

      const result = await service.applyQualificationResult("lead-1", {
        ...BASE_QUALIFICATION_PAYLOAD,
        leadScore: 92,
        confidenceTier: "HIGH",
      });

      expect(leadRepository.updateStatus).toHaveBeenCalledWith("lead-1", { status: "QUALIFIED" });
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: "lead-1",
          type: "STATUS_CHANGE",
          metadata: expect.objectContaining({ from: "AI_ANALYZED", to: "QUALIFIED" }),
        })
      );
      expect(result.status).toBe("QUALIFIED");
    });

    it("LOW confidence auto-routes AI_ANALYZED -> DISQUALIFIED", async () => {
      const leadRepository = createLeadRepository({
        findById: vi.fn().mockResolvedValue(leadRow({ status: "VALIDATED" })),
        updateStatus: vi.fn().mockResolvedValue(leadRow({ status: "DISQUALIFIED", score: 12 })),
      });
      const activityRepository = createActivityRepository();
      const service = buildService({ leadRepository, activityRepository });

      const result = await service.applyQualificationResult("lead-1", {
        ...BASE_QUALIFICATION_PAYLOAD,
        leadScore: 12,
        confidenceTier: "LOW",
      });

      expect(leadRepository.updateStatus).toHaveBeenCalledWith("lead-1", { status: "DISQUALIFIED" });
      expect(result.status).toBe("DISQUALIFIED");
    });

    it("MEDIUM confidence (or a missing tier) stays at AI_ANALYZED — the review bucket", async () => {
      const leadRepository = createLeadRepository({
        findById: vi.fn().mockResolvedValue(leadRow({ status: "VALIDATED" })),
      });
      const service = buildService({ leadRepository });

      await service.applyQualificationResult("lead-1", {
        ...BASE_QUALIFICATION_PAYLOAD,
        confidenceTier: "MEDIUM",
      });

      expect(leadRepository.updateStatus).not.toHaveBeenCalled();
    });

    it("records an AUTOMATION activity for the recommended action with a computed follow-up window", async () => {
      const leadRepository = createLeadRepository({
        findById: vi.fn().mockResolvedValue(leadRow({ status: "VALIDATED" })),
      });
      const activityRepository = createActivityRepository();
      const service = buildService({ leadRepository, activityRepository });

      await service.applyQualificationResult("lead-1", {
        ...BASE_QUALIFICATION_PAYLOAD,
        recommendedAction: "Schedule a demo",
        estimatedTimeline: "SHORT_TERM",
      });

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: "lead-1",
          type: "AUTOMATION",
          body: "Recommended: Schedule a demo",
          metadata: expect.objectContaining({ estimatedTimeline: "SHORT_TERM", followUpDueInDays: 3 }),
        })
      );
    });

    it("dispatches the lead.qualified webhook with the final pipeline stage after a full write-back", async () => {
      const leadRepository = createLeadRepository({
        findById: vi.fn().mockResolvedValue(leadRow({ status: "VALIDATED" })),
        updateStatus: vi.fn().mockResolvedValue(leadRow({ status: "QUALIFIED", score: 92 })),
      });
      const webhookService = createWebhookService();
      const service = buildService({ leadRepository, webhookService });

      await service.applyQualificationResult("lead-1", {
        ...BASE_QUALIFICATION_PAYLOAD,
        leadScore: 92,
        confidenceTier: "HIGH",
      });

      expect(webhookService.dispatchLeadQualified).toHaveBeenCalledWith(
        expect.objectContaining({ id: "lead-1", status: "QUALIFIED" }),
        expect.objectContaining({ leadScore: 92, confidenceTier: "HIGH" }),
        "QUALIFIED"
      );
    });
  });

  describe("assignLead", () => {
    const BASE_ASSIGN_META = {
      contractVersion: "1",
      workflowExecutionId: "exec-4",
      workflowName: "04-sales-automation",
    };

    it("assigns the lead and records a system-actor ASSIGNMENT activity", async () => {
      const leadRepository = createLeadRepository({
        updateAssignment: vi.fn().mockResolvedValue(leadRow({ assignedToId: "user-2" })),
      });
      const activityRepository = createActivityRepository();
      const executionLogRepository = createExecutionLogRepository();
      const service = buildService({ leadRepository, activityRepository, executionLogRepository });

      await service.assignLead("lead-1", { ...BASE_ASSIGN_META, assignedToId: "user-2" });

      expect(leadRepository.updateAssignment).toHaveBeenCalledWith("lead-1", "user-2");
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: "lead-1", type: "ASSIGNMENT", actorId: null })
      );
      expect(executionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ workflowName: "04-sales-automation", status: "SUCCESS" })
      );
    });

    it("is idempotent — a replayed workflowExecutionId does not re-assign", async () => {
      const leadRepository = createLeadRepository({
        updateAssignment: vi.fn().mockResolvedValue(leadRow({ assignedToId: "user-2" })),
      });
      const executionLogRepository = createExecutionLogRepository({
        findByExecutionId: vi.fn().mockResolvedValue({ status: "SUCCESS" }),
      });
      const service = buildService({ leadRepository, executionLogRepository });

      await service.assignLead("lead-1", { ...BASE_ASSIGN_META, assignedToId: "user-2" });

      expect(leadRepository.updateAssignment).not.toHaveBeenCalled();
    });

    it("throws NotFoundError for a missing lead", async () => {
      const leadRepository = createLeadRepository({ findById: vi.fn().mockResolvedValue(null) });
      const service = buildService({ leadRepository });

      await expect(
        service.assignLead("missing", { ...BASE_ASSIGN_META, assignedToId: "user-2" })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
