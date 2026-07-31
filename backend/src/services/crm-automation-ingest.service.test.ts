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
} = {}) {
  return new CrmAutomationIngestService(
    (overrides.leadRepository ?? createLeadRepository()) as never,
    (overrides.activityRepository ?? createActivityRepository()) as never,
    (overrides.aiAnalysisRepository ?? createAiAnalysisRepository()) as never,
    (overrides.executionLogRepository ?? createExecutionLogRepository()) as never
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
  });
});
