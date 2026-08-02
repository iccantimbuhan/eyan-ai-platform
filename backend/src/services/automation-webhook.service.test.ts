import { beforeEach, describe, expect, it, vi } from "vitest";

const { postMock, errorMock, debugMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  errorMock: vi.fn(),
  debugMock: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ post: postMock })),
  },
}));

vi.mock("../config/env.js", () => ({
  env: {
    automationHubWebhookUrl: "",
    automationHubLeadQualifiedWebhookUrl: "",
    automationWebhookSigningSecret: "",
    automationWebhookTimeout: 5000,
  },
}));

vi.mock("../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: errorMock,
    debug: debugMock,
  },
}));

import { env } from "../config/env.js";
import { AutomationWebhookService } from "./automation-webhook.service.js";

function setEnv(overrides: Partial<typeof env>) {
  Object.assign(env, overrides);
}

function leadRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "lead-1",
    contactName: "Jane Doe",
    email: "jane@example.com",
    phone: null,
    company: "Acme",
    industry: null,
    companySize: null,
    source: "WEBSITE_FORM",
    createdAt: new Date(2026, 6, 15),
    ...overrides,
  } as never;
}

describe("AutomationWebhookService.dispatchLeadIntake", () => {
  beforeEach(() => {
    postMock.mockReset();
    errorMock.mockReset();
    debugMock.mockReset();
    setEnv({
      automationHubWebhookUrl: "",
      automationHubLeadQualifiedWebhookUrl: "",
      automationWebhookSigningSecret: "",
      automationWebhookTimeout: 5000,
    });
  });

  it("skips the dispatch entirely when the Automation Hub isn't configured", async () => {
    const service = new AutomationWebhookService();

    await service.dispatchLeadIntake(leadRow());

    expect(postMock).not.toHaveBeenCalled();
    expect(debugMock).toHaveBeenCalledOnce();
  });

  it("signs and posts the payload when fully configured", async () => {
    setEnv({
      automationHubWebhookUrl: "https://automation.eyan.fyi/webhook/crm/lead-intake",
      automationWebhookSigningSecret: "shared-secret",
    });
    postMock.mockResolvedValue({ status: 200 });

    const service = new AutomationWebhookService();

    await service.dispatchLeadIntake(leadRow());

    expect(postMock).toHaveBeenCalledOnce();
    const [url, body, config] = postMock.mock.calls[0];
    expect(url).toBe("https://automation.eyan.fyi/webhook/crm/lead-intake");
    expect(JSON.parse(body)).toEqual(
      expect.objectContaining({
        contractVersion: "1",
        event: "lead.created",
        lead: expect.objectContaining({ id: "lead-1", email: "jane@example.com" }),
      })
    );
    expect(config.headers["X-Eyan-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(config.headers["X-Eyan-Timestamp"]).toMatch(/^\d+$/);
  });

  it("never throws when the dispatch fails — logs instead", async () => {
    setEnv({
      automationHubWebhookUrl: "https://automation.eyan.fyi/webhook/crm/lead-intake",
      automationWebhookSigningSecret: "shared-secret",
    });
    postMock.mockRejectedValue(new Error("network error"));

    const service = new AutomationWebhookService();

    await expect(service.dispatchLeadIntake(leadRow())).resolves.toBeUndefined();
    expect(errorMock).toHaveBeenCalledOnce();
  });
});

function qualificationDto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    contractVersion: "1",
    workflowExecutionId: "exec-2",
    workflowName: "03-ai-qualification",
    provider: "ollama",
    model: "qwen2.5-coder:7b",
    promptVersion: "v1",
    leadScore: 85,
    confidence: 0.9,
    priority: "HIGH",
    recommendedAction: "Schedule a demo",
    summary: "Strong fit.",
    reasoning: "High budget signal, decision maker identified.",
    confidenceTier: "HIGH",
    ...overrides,
  } as never;
}

describe("AutomationWebhookService.dispatchLeadQualified", () => {
  beforeEach(() => {
    postMock.mockReset();
    errorMock.mockReset();
    debugMock.mockReset();
    setEnv({
      automationHubWebhookUrl: "",
      automationHubLeadQualifiedWebhookUrl: "",
      automationWebhookSigningSecret: "",
      automationWebhookTimeout: 5000,
    });
  });

  it("skips the dispatch when the lead-qualified webhook URL isn't configured", async () => {
    const service = new AutomationWebhookService();

    await service.dispatchLeadQualified(leadRow(), qualificationDto(), "QUALIFIED");

    expect(postMock).not.toHaveBeenCalled();
    expect(debugMock).toHaveBeenCalledOnce();
  });

  it("signs and posts the lead.qualified payload when fully configured", async () => {
    setEnv({
      automationHubLeadQualifiedWebhookUrl: "https://automation.eyan.fyi/webhook/crm/lead-qualified",
      automationWebhookSigningSecret: "shared-secret",
    });
    postMock.mockResolvedValue({ status: 200 });

    const service = new AutomationWebhookService();

    await service.dispatchLeadQualified(leadRow(), qualificationDto(), "QUALIFIED");

    expect(postMock).toHaveBeenCalledOnce();
    const [url, body, config] = postMock.mock.calls[0];
    expect(url).toBe("https://automation.eyan.fyi/webhook/crm/lead-qualified");
    expect(JSON.parse(body)).toEqual(
      expect.objectContaining({
        contractVersion: "1",
        event: "lead.qualified",
        lead: expect.objectContaining({ id: "lead-1" }),
        qualification: expect.objectContaining({
          score: 85,
          confidenceTier: "HIGH",
          recommendedAction: "Schedule a demo",
        }),
        pipelineStage: "QUALIFIED",
      })
    );
    expect(config.headers["X-Eyan-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("never throws when the dispatch fails — logs instead", async () => {
    setEnv({
      automationHubLeadQualifiedWebhookUrl: "https://automation.eyan.fyi/webhook/crm/lead-qualified",
      automationWebhookSigningSecret: "shared-secret",
    });
    postMock.mockRejectedValue(new Error("network error"));

    const service = new AutomationWebhookService();

    await expect(
      service.dispatchLeadQualified(leadRow(), qualificationDto(), "QUALIFIED")
    ).resolves.toBeUndefined();
    expect(errorMock).toHaveBeenCalledOnce();
  });
});
