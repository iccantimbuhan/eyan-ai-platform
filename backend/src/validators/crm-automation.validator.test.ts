import { validationResult } from "express-validator";
import type { Request } from "express";
import { describe, expect, it } from "vitest";

import {
  applyQualificationResultValidator,
  applyValidationResultValidator,
  dedupeLeadQueryValidator,
} from "./crm-automation.validator.js";

async function run(validators: unknown[], req: Request) {
  for (const validator of validators as { run: (req: Request) => Promise<unknown> }[]) {
    await validator.run(req);
  }
  return validationResult(req);
}

function fakeRequest(overrides: { body?: Record<string, unknown>; query?: Record<string, unknown> } = {}): Request {
  return { body: overrides.body ?? {}, query: overrides.query ?? {}, params: {} } as unknown as Request;
}

const BASE_META = {
  contractVersion: "1",
  workflowExecutionId: "exec-1",
  workflowName: "02-validation",
};

describe("dedupeLeadQueryValidator", () => {
  it("accepts a valid email", async () => {
    const result = await run(dedupeLeadQueryValidator, fakeRequest({ query: { email: "jane@example.com" } }));

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a missing/invalid email", async () => {
    const result = await run(dedupeLeadQueryValidator, fakeRequest({ query: { email: "not-an-email" } }));

    expect(result.isEmpty()).toBe(false);
  });
});

describe("applyValidationResultValidator", () => {
  it("accepts a well-formed VALIDATED payload", async () => {
    const result = await run(
      applyValidationResultValidator,
      fakeRequest({ body: { ...BASE_META, status: "VALIDATED" } })
    );

    expect(result.isEmpty()).toBe(true);
  });

  it("accepts a well-formed DISQUALIFIED payload", async () => {
    const result = await run(
      applyValidationResultValidator,
      fakeRequest({ body: { ...BASE_META, status: "DISQUALIFIED" } })
    );

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a status outside {VALIDATED, DISQUALIFIED} — e.g. QUALIFIED can't be reached from this endpoint", async () => {
    const result = await run(
      applyValidationResultValidator,
      fakeRequest({ body: { ...BASE_META, status: "QUALIFIED" } })
    );

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects a payload missing workflowExecutionId", async () => {
    const result = await run(
      applyValidationResultValidator,
      fakeRequest({
        body: { contractVersion: "1", workflowName: "02-validation", status: "VALIDATED" },
      })
    );

    expect(result.isEmpty()).toBe(false);
  });
});

describe("applyQualificationResultValidator", () => {
  const validPayload = {
    ...BASE_META,
    provider: "ollama",
    model: "qwen2.5-coder:7b",
    promptVersion: "v1",
    leadScore: 72,
    confidence: 0.5,
    priority: "MEDIUM",
    recommendedAction: "Follow up",
    summary: "Dummy summary",
    reasoning: "Dummy reasoning",
  };

  it("accepts a well-formed dummy qualification payload", async () => {
    const result = await run(applyQualificationResultValidator, fakeRequest({ body: validPayload }));

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a leadScore outside 0-100", async () => {
    const result = await run(
      applyQualificationResultValidator,
      fakeRequest({ body: { ...validPayload, leadScore: 150 } })
    );

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects a confidence outside 0.0-1.0", async () => {
    const result = await run(
      applyQualificationResultValidator,
      fakeRequest({ body: { ...validPayload, confidence: 1.5 } })
    );

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects an invalid priority", async () => {
    const result = await run(
      applyQualificationResultValidator,
      fakeRequest({ body: { ...validPayload, priority: "MADE_UP" } })
    );

    expect(result.isEmpty()).toBe(false);
  });

  it("accepts the optional five Phase 0.5 fields when present", async () => {
    const result = await run(
      applyQualificationResultValidator,
      fakeRequest({
        body: {
          ...validPayload,
          buyingIntent: "HIGH",
          urgency: "LOW",
          decisionMakerIdentified: true,
          estimatedTimeline: "SHORT_TERM",
          riskLevel: "MEDIUM",
        },
      })
    );

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects an invalid estimatedTimeline value", async () => {
    const result = await run(
      applyQualificationResultValidator,
      fakeRequest({ body: { ...validPayload, estimatedTimeline: "EVENTUALLY" } })
    );

    expect(result.isEmpty()).toBe(false);
  });
});
