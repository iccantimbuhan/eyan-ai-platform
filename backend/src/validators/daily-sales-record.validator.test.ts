import { validationResult } from "express-validator";
import type { Request } from "express";
import { describe, expect, it } from "vitest";

import { createDailySalesRecordValidator, updateDailySalesRecordValidator } from "./daily-sales-record.validator.js";

async function run(validators: unknown[], req: Request) {
  for (const validator of validators as { run: (req: Request) => Promise<unknown> }[]) {
    await validator.run(req);
  }
  return validationResult(req);
}

function fakeRequest(body: Record<string, unknown>): Request {
  return { body, query: {}, params: {} } as unknown as Request;
}

// actualCashCounted (ADR-0043) — a manager-entered physical cash count,
// same non-negative-or-absent posture as discountsTotal/vouchersAmount.
describe("createDailySalesRecordValidator — actualCashCounted", () => {
  const baseBody = { businessDate: "2026-08-03", source: "MANUAL", totalSales: 100 };

  it("accepts a payload with no actualCashCounted at all (optional field)", async () => {
    const result = await run(createDailySalesRecordValidator, fakeRequest(baseBody));

    expect(result.isEmpty()).toBe(true);
  });

  it("accepts a valid non-negative actualCashCounted", async () => {
    const result = await run(createDailySalesRecordValidator, fakeRequest({ ...baseBody, actualCashCounted: 1328.45 }));

    expect(result.isEmpty()).toBe(true);
  });

  it("accepts zero", async () => {
    const result = await run(createDailySalesRecordValidator, fakeRequest({ ...baseBody, actualCashCounted: 0 }));

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a negative actualCashCounted", async () => {
    const result = await run(createDailySalesRecordValidator, fakeRequest({ ...baseBody, actualCashCounted: -0.01 }));

    expect(result.isEmpty()).toBe(false);
  });
});

describe("updateDailySalesRecordValidator — actualCashCounted", () => {
  it("accepts an explicit null (clearing a previously entered count)", async () => {
    const result = await run(updateDailySalesRecordValidator, fakeRequest({ actualCashCounted: null }));

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a negative actualCashCounted", async () => {
    const result = await run(updateDailySalesRecordValidator, fakeRequest({ actualCashCounted: -5 }));

    expect(result.isEmpty()).toBe(false);
  });
});
