import { describe, expect, it } from "vitest";

import { signAutomationPayload } from "./automation-signature.js";

describe("signAutomationPayload", () => {
  it("is deterministic for the same body, timestamp, and secret", () => {
    const a = signAutomationPayload('{"lead":"1"}', 1000, "secret");
    const b = signAutomationPayload('{"lead":"1"}', 1000, "secret");

    expect(a).toBe(b);
  });

  it("changes when the body changes", () => {
    const a = signAutomationPayload('{"lead":"1"}', 1000, "secret");
    const b = signAutomationPayload('{"lead":"2"}', 1000, "secret");

    expect(a).not.toBe(b);
  });

  it("changes when the timestamp changes — binds the signature to a specific moment", () => {
    const a = signAutomationPayload('{"lead":"1"}', 1000, "secret");
    const b = signAutomationPayload('{"lead":"1"}', 2000, "secret");

    expect(a).not.toBe(b);
  });

  it("changes when the secret changes", () => {
    const a = signAutomationPayload('{"lead":"1"}', 1000, "secret-a");
    const b = signAutomationPayload('{"lead":"1"}', 1000, "secret-b");

    expect(a).not.toBe(b);
  });

  it("produces a hex-encoded SHA-256 digest (64 hex characters)", () => {
    const signature = signAutomationPayload('{"lead":"1"}', 1000, "secret");

    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });
});
