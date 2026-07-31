import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    leadAiAnalysis: {
      create: createMock,
    },
  },
}));

const { CrmAiAnalysisRepository } = await import("./crm-ai-analysis.repository.js");

describe("CrmAiAnalysisRepository", () => {
  const repository = new CrmAiAnalysisRepository();

  beforeEach(() => {
    createMock.mockReset();
  });

  it("creates a LeadAiAnalysis row with the given data", async () => {
    createMock.mockResolvedValue({});

    const data = {
      leadId: "lead-1",
      provider: "ollama",
      model: "qwen2.5-coder:7b",
      promptVersion: "v1",
      leadScore: 72,
      confidence: 0.5,
      priority: "MEDIUM" as const,
      recommendedAction: "Follow up",
      summary: "Dummy summary",
      reasoning: "Dummy reasoning",
      rawResponse: { leadScore: 72 },
    };

    await repository.create(data);

    expect(createMock).toHaveBeenCalledWith({ data });
  });
});
