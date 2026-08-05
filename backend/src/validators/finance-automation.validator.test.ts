import { validationResult } from "express-validator";
import type { Request } from "express";
import { describe, expect, it } from "vitest";

import {
  createExpenseAutomatedValidator,
  getDashboardAutomatedValidator,
} from "./finance-automation.validator.js";

async function run(validators: unknown[], req: Request) {
  for (const validator of validators as { run: (req: Request) => Promise<unknown> }[]) {
    await validator.run(req);
  }
  return validationResult(req);
}

function fakeRequest(
  overrides: { body?: Record<string, unknown>; query?: Record<string, unknown> } = {}
): Request {
  return { body: overrides.body ?? {}, query: overrides.query ?? {}, params: {} } as unknown as Request;
}

const BASE_META = {
  contractVersion: "1",
  workflowExecutionId: "exec-1",
  workflowName: "10-handle-create-expense",
};

const BASE_SOURCE = {
  channel: "slack",
  externalUserId: "U012ABC",
};

describe("createExpenseAutomatedValidator", () => {
  it("accepts a well-formed expense payload", async () => {
    const result = await run(
      createExpenseAutomatedValidator,
      fakeRequest({
        body: {
          ...BASE_META,
          source: BASE_SOURCE,
          date: "2026-08-05",
          amount: "12.50",
          category: "FOOD",
        },
      })
    );

    expect(result.isEmpty()).toBe(true);
  });

  it("accepts an optional intent of UPLOAD_RECEIPT", async () => {
    const result = await run(
      createExpenseAutomatedValidator,
      fakeRequest({
        body: {
          ...BASE_META,
          source: BASE_SOURCE,
          date: "2026-08-05",
          amount: "12.50",
          category: "FOOD",
          intent: "UPLOAD_RECEIPT",
        },
      })
    );

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a missing workflowExecutionId (ADR-0019 idempotency contract)", async () => {
    const result = await run(
      createExpenseAutomatedValidator,
      fakeRequest({
        body: {
          contractVersion: "1",
          workflowName: "10-handle-create-expense",
          source: BASE_SOURCE,
          date: "2026-08-05",
          amount: "12.50",
          category: "FOOD",
        },
      })
    );

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects a missing source.channel", async () => {
    const result = await run(
      createExpenseAutomatedValidator,
      fakeRequest({
        body: {
          ...BASE_META,
          source: { externalUserId: "U012ABC" },
          date: "2026-08-05",
          amount: "12.50",
          category: "FOOD",
        },
      })
    );

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects a zero/negative amount", async () => {
    const result = await run(
      createExpenseAutomatedValidator,
      fakeRequest({
        body: {
          ...BASE_META,
          source: BASE_SOURCE,
          date: "2026-08-05",
          amount: "0",
          category: "FOOD",
        },
      })
    );

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects an invalid category", async () => {
    const result = await run(
      createExpenseAutomatedValidator,
      fakeRequest({
        body: {
          ...BASE_META,
          source: BASE_SOURCE,
          date: "2026-08-05",
          amount: "12.50",
          category: "NOT_A_REAL_CATEGORY",
        },
      })
    );

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects an invalid intent", async () => {
    const result = await run(
      createExpenseAutomatedValidator,
      fakeRequest({
        body: {
          ...BASE_META,
          source: BASE_SOURCE,
          date: "2026-08-05",
          amount: "12.50",
          category: "FOOD",
          intent: "CREATE_INCOME",
        },
      })
    );

    expect(result.isEmpty()).toBe(false);
  });
});

describe("getDashboardAutomatedValidator", () => {
  it("accepts an omitted period", async () => {
    const result = await run(getDashboardAutomatedValidator, fakeRequest());

    expect(result.isEmpty()).toBe(true);
  });

  it("accepts a well-formed YYYY-MM period", async () => {
    const result = await run(
      getDashboardAutomatedValidator,
      fakeRequest({ query: { period: "2026-08" } })
    );

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a malformed period", async () => {
    const result = await run(
      getDashboardAutomatedValidator,
      fakeRequest({ query: { period: "not-a-period" } })
    );

    expect(result.isEmpty()).toBe(false);
  });
});
