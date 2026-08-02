import { describe, expect, it, vi } from "vitest";

import { CrmLeadService } from "./crm-lead.service.js";
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

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue(leadRow()),
    findById: vi.fn().mockResolvedValue(leadRow()),
    findByEmail: vi.fn().mockResolvedValue(null),
    updateFields: vi.fn().mockResolvedValue(leadRow()),
    updateStatus: vi.fn().mockResolvedValue(leadRow({ status: "VALIDATED" })),
    updateAssignment: vi.fn().mockResolvedValue(leadRow({ assignedToId: "user-2" })),
    findMany: vi.fn().mockResolvedValue([leadRow()]),
    count: vi.fn().mockResolvedValue(1),
    ...overrides,
  };
}

function createActivityRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({}),
    findManyForLead: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createWebhookService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    dispatchLeadIntake: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createAutomationIngestService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    rerunQualification: vi.fn().mockResolvedValue({ id: "lead-1", status: "QUALIFIED" }),
    ...overrides,
  };
}

function createCapabilityService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    invoke: vi.fn().mockResolvedValue({
      output: "{}",
      outputJson: {
        leadScore: 88,
        confidence: 0.82,
        priority: "HIGH",
        recommendedAction: "Schedule a demo",
        summary: "Strong fit.",
        reasoning: "High budget signal.",
      },
      brain: "sales-brain",
      provider: "ollama",
      model: "qwen2.5-coder:7b",
      promptVersion: "v1",
      confidence: "HIGH",
      needsManualReview: false,
      outcome: "VALID",
      retryCount: 0,
      latencyMs: 1200,
    }),
    ...overrides,
  };
}

describe("CrmLeadService", () => {
  it("create() defaults source to WEBSITE_FORM and captures the full payload in rawSubmission", async () => {
    const repository = createRepository();
    const service = new CrmLeadService(repository as never, createActivityRepository() as never);

    await service.create({
      contactName: "Jane Doe",
      email: "jane@example.com",
      company: "Acme",
      utmSource: "google",
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "WEBSITE_FORM",
        contactName: "Jane Doe",
        email: "jane@example.com",
        rawSubmission: expect.objectContaining({ utmSource: "google" }),
      })
    );
  });

  it("create() dispatches the lead-intake webhook (fire-and-forget) with the persisted lead", async () => {
    const repository = createRepository();
    const webhookService = createWebhookService();
    const service = new CrmLeadService(
      repository as never,
      createActivityRepository() as never,
      webhookService as never
    );

    await service.create({ contactName: "Jane Doe", email: "jane@example.com" });

    expect(webhookService.dispatchLeadIntake).toHaveBeenCalledWith(
      expect.objectContaining({ id: "lead-1", email: "jane@example.com" })
    );
  });

  it("getById() throws NotFoundError when the lead doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new CrmLeadService(repository as never, createActivityRepository() as never);

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("updateStatus() allows NEW -> VALIDATED and records a STATUS_CHANGE activity", async () => {
    const repository = createRepository();
    const activityRepository = createActivityRepository();
    const service = new CrmLeadService(repository as never, activityRepository as never);

    await service.updateStatus("lead-1", { status: "VALIDATED" }, "user-1");

    expect(repository.updateStatus).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ status: "VALIDATED" })
    );
    expect(activityRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: "lead-1",
        type: "STATUS_CHANGE",
        actorId: "user-1",
        metadata: { from: "NEW", to: "VALIDATED" },
      })
    );
  });

  it("updateStatus() rejects NEW -> QUALIFIED (skipping the lifecycle) with InvalidLeadStatusTransitionError", async () => {
    const repository = createRepository();
    const activityRepository = createActivityRepository();
    const service = new CrmLeadService(repository as never, activityRepository as never);

    await expect(
      service.updateStatus("lead-1", { status: "QUALIFIED" }, "user-1")
    ).rejects.toThrow(InvalidLeadStatusTransitionError);

    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(activityRepository.create).not.toHaveBeenCalled();
  });

  it("updateStatus() rejects NEW -> LOST — LOST is only reachable from VALIDATED onward, DISQUALIFIED is NEW's terminal path", async () => {
    const repository = createRepository();
    const service = new CrmLeadService(repository as never, createActivityRepository() as never);

    await expect(service.updateStatus("lead-1", { status: "LOST" }, "user-1")).rejects.toThrow(
      InvalidLeadStatusTransitionError
    );
  });

  it("updateStatus() allows AI_ANALYZED -> DISQUALIFIED — a rep manually rejecting a reviewed AI qualification", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(leadRow({ status: "AI_ANALYZED" })),
      updateStatus: vi.fn().mockResolvedValue(leadRow({ status: "DISQUALIFIED" })),
    });
    const activityRepository = createActivityRepository();
    const service = new CrmLeadService(repository as never, activityRepository as never);

    await service.updateStatus("lead-1", { status: "DISQUALIFIED" }, "user-1");

    expect(repository.updateStatus).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ status: "DISQUALIFIED" })
    );
  });

  it("updateStatus() rejects any transition out of a terminal state (CONVERTED)", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(leadRow({ status: "CONVERTED" })),
    });
    const service = new CrmLeadService(repository as never, createActivityRepository() as never);

    await expect(service.updateStatus("lead-1", { status: "LOST" }, "user-1")).rejects.toThrow(
      InvalidLeadStatusTransitionError
    );
  });

  it("updateStatus() to LOST persists the provided lostReason", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(leadRow({ status: "QUALIFIED" })),
    });
    const service = new CrmLeadService(repository as never, createActivityRepository() as never);

    await service.updateStatus("lead-1", { status: "LOST", lostReason: "Went silent" }, "user-1");

    expect(repository.updateStatus).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ status: "LOST", lostReason: "Went silent" })
    );
  });

  it("assign() updates assignedToId and records an ASSIGNMENT activity with from/to metadata", async () => {
    const repository = createRepository();
    const activityRepository = createActivityRepository();
    const service = new CrmLeadService(repository as never, activityRepository as never);

    await service.assign("lead-1", { assignedToId: "user-2" }, "user-1");

    expect(repository.updateAssignment).toHaveBeenCalledWith("lead-1", "user-2");
    expect(activityRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ASSIGNMENT",
        actorId: "user-1",
        metadata: { from: null, to: "user-2" },
      })
    );
  });

  it("addNote() records a NOTE activity and returns the refreshed lead detail", async () => {
    const repository = createRepository();
    const activityRepository = createActivityRepository();
    const service = new CrmLeadService(repository as never, activityRepository as never);

    const result = await service.addNote("lead-1", { body: "Follow up Friday." }, "user-1");

    expect(activityRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: "lead-1", type: "NOTE", actorId: "user-1", body: "Follow up Friday." })
    );
    expect(result.id).toBe("lead-1");
  });

  it("update() verifies the lead exists before writing", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new CrmLeadService(repository as never, createActivityRepository() as never);

    await expect(service.update("missing", { contactName: "New Name" })).rejects.toThrow(
      NotFoundError
    );
    expect(repository.updateFields).not.toHaveBeenCalled();
  });

  describe("rerunQualification", () => {
    function buildService(overrides: {
      repository?: ReturnType<typeof createRepository>;
      capabilityService?: ReturnType<typeof createCapabilityService>;
      automationIngestService?: ReturnType<typeof createAutomationIngestService>;
    } = {}) {
      return new CrmLeadService(
        (overrides.repository ?? createRepository()) as never,
        createActivityRepository() as never,
        createWebhookService() as never,
        (overrides.automationIngestService ?? createAutomationIngestService()) as never,
        (overrides.capabilityService ?? createCapabilityService()) as never
      );
    }

    it("invokes the lead-qualification Capability in-process with the lead's fields", async () => {
      const repository = createRepository();
      const capabilityService = createCapabilityService();
      const service = buildService({ repository, capabilityService });

      await service.rerunQualification("lead-1", "user-1");

      expect(capabilityService.invoke).toHaveBeenCalledWith(
        "lead-qualification",
        expect.objectContaining({ contactName: "Jane Doe", email: "jane@example.com" }),
        expect.objectContaining({ expectJson: true }),
        "user-1"
      );
    });

    it("delegates persistence to CrmAutomationIngestService.rerunQualification with the mapped AI Core result", async () => {
      const automationIngestService = createAutomationIngestService();
      const service = buildService({ automationIngestService });

      await service.rerunQualification("lead-1", "user-1");

      expect(automationIngestService.rerunQualification).toHaveBeenCalledWith(
        "lead-1",
        expect.objectContaining({
          provider: "ollama",
          model: "qwen2.5-coder:7b",
          promptVersion: "v1",
          leadScore: 88,
          confidence: 0.82,
          priority: "HIGH",
          recommendedAction: "Schedule a demo",
          confidenceTier: "HIGH",
        })
      );
    });

    it("throws when AI Core doesn't return a usable result", async () => {
      const capabilityService = createCapabilityService({
        invoke: vi.fn().mockResolvedValue({ outcome: "DEFINITIVE_FAILURE", outputJson: undefined }),
      });
      const service = buildService({ capabilityService });

      await expect(service.rerunQualification("lead-1", "user-1")).rejects.toThrow(
        "AI qualification did not return a usable result."
      );
    });

    it("throws NotFoundError for a missing lead", async () => {
      const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
      const service = buildService({ repository });

      await expect(service.rerunQualification("missing", "user-1")).rejects.toThrow(NotFoundError);
    });
  });
});
