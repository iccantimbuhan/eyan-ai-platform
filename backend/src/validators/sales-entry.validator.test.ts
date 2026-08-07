import { validationResult } from "express-validator";
import type { Request } from "express";
import { describe, expect, it } from "vitest";

import { createItemEntryValidator } from "./sales-entry.validator.js";

async function run(validators: unknown[], req: Request) {
  for (const validator of validators as { run: (req: Request) => Promise<unknown> }[]) {
    await validator.run(req);
  }
  return validationResult(req);
}

function fakeRequest(body: Record<string, unknown>): Request {
  return { body, query: {}, params: {} } as unknown as Request;
}

// POS-reported %QT/%SALE — manually transcribed from the POS X/Z report,
// optional because not every entry comes from a POS report and future
// OCR/AI ingestion isn't built yet.
describe("createItemEntryValidator — POS % Qty / POS % Sales", () => {
  const baseBody = { itemName: "Margherita", quantity: 6, amount: 63.0 };

  it("accepts a payload with no POS percentages at all (optional fields)", async () => {
    const result = await run(createItemEntryValidator, fakeRequest(baseBody));

    expect(result.isEmpty()).toBe(true);
  });

  it("accepts the spec's own worked example — 6 sold, €63.00, 33.33% qty, 29.90% sales", async () => {
    const result = await run(
      createItemEntryValidator,
      fakeRequest({ ...baseBody, posQuantityPercent: 33.33, posSalesPercent: 29.9 })
    );

    expect(result.isEmpty()).toBe(true);
  });

  it("accepts explicit null for both fields (historical entries have none)", async () => {
    const result = await run(
      createItemEntryValidator,
      fakeRequest({ ...baseBody, posQuantityPercent: null, posSalesPercent: null })
    );

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a negative POS % Qty", async () => {
    const result = await run(createItemEntryValidator, fakeRequest({ ...baseBody, posQuantityPercent: -5 }));

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects a negative POS % Sales", async () => {
    const result = await run(createItemEntryValidator, fakeRequest({ ...baseBody, posSalesPercent: -0.01 }));

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects a POS % Qty over 100", async () => {
    const result = await run(createItemEntryValidator, fakeRequest({ ...baseBody, posQuantityPercent: 100.01 }));

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects a POS % Sales over 100", async () => {
    const result = await run(createItemEntryValidator, fakeRequest({ ...baseBody, posSalesPercent: 150 }));

    expect(result.isEmpty()).toBe(false);
  });

  it("accepts exactly 0 and exactly 100 as boundary values", async () => {
    const zero = await run(createItemEntryValidator, fakeRequest({ ...baseBody, posQuantityPercent: 0, posSalesPercent: 0 }));
    const hundred = await run(
      createItemEntryValidator,
      fakeRequest({ ...baseBody, posQuantityPercent: 100, posSalesPercent: 100 })
    );

    expect(zero.isEmpty()).toBe(true);
    expect(hundred.isEmpty()).toBe(true);
  });
});
