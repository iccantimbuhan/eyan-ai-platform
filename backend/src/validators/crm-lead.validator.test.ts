import { validationResult } from "express-validator";
import type { Request } from "express";
import { describe, expect, it } from "vitest";

import {
  assignLeadValidator,
  createLeadNoteValidator,
  createLeadValidator,
  updateLeadStatusValidator,
} from "./crm-lead.validator.js";

async function run(validators: unknown[], req: Request) {
  for (const validator of validators as { run: (req: Request) => Promise<unknown> }[]) {
    await validator.run(req);
  }
  return validationResult(req);
}

function fakeRequest(body: Record<string, unknown>): Request {
  return { body, query: {}, params: {} } as unknown as Request;
}

describe("createLeadValidator (public Lead Form intake)", () => {
  it("accepts a minimal valid payload (only contactName + email)", async () => {
    const result = await run(
      createLeadValidator,
      fakeRequest({ contactName: "Jane Doe", email: "jane@example.com" })
    );

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a missing contactName", async () => {
    const result = await run(createLeadValidator, fakeRequest({ email: "jane@example.com" }));

    expect(result.isEmpty()).toBe(false);
  });

  it("rejects an invalid email", async () => {
    const result = await run(
      createLeadValidator,
      fakeRequest({ contactName: "Jane Doe", email: "not-an-email" })
    );

    expect(result.isEmpty()).toBe(false);
  });
});

describe("updateLeadStatusValidator", () => {
  it("accepts a known status", async () => {
    const result = await run(updateLeadStatusValidator, fakeRequest({ status: "VALIDATED" }));

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects an unknown status", async () => {
    const result = await run(updateLeadStatusValidator, fakeRequest({ status: "MADE_UP" }));

    expect(result.isEmpty()).toBe(false);
  });
});

describe("assignLeadValidator", () => {
  it("accepts a string assignedToId", async () => {
    const result = await run(assignLeadValidator, fakeRequest({ assignedToId: "user-2" }));

    expect(result.isEmpty()).toBe(true);
  });

  it("accepts null (unassign)", async () => {
    const result = await run(assignLeadValidator, fakeRequest({ assignedToId: null }));

    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a non-string, non-null assignedToId", async () => {
    const result = await run(assignLeadValidator, fakeRequest({ assignedToId: 42 }));

    expect(result.isEmpty()).toBe(false);
  });
});

describe("createLeadNoteValidator", () => {
  it("rejects an empty note body", async () => {
    const result = await run(createLeadNoteValidator, fakeRequest({ body: "  " }));

    expect(result.isEmpty()).toBe(false);
  });

  it("accepts a normal note", async () => {
    const result = await run(createLeadNoteValidator, fakeRequest({ body: "Called, left voicemail." }));

    expect(result.isEmpty()).toBe(true);
  });
});
