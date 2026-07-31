import crypto from "node:crypto";

// ADR-0019 Decision 1 — HMAC-SHA256 over `${timestamp}.${rawBody}`, not the
// body alone, so a captured signature+body pair can't be replayed
// indefinitely: the receiving side (n8n, not built this sprint) checks both
// the signature and that the timestamp is within its freshness window.
export function signAutomationPayload(
  rawBody: string,
  timestampMs: number,
  secret: string
): string {
  const signed = `${timestampMs}.${rawBody}`;

  return crypto.createHmac("sha256", secret).update(signed).digest("hex");
}
