import type { LeadStatus } from "../generated/prisma/enums.js";

// Server-enforced lifecycle (TDD §8) — the only place that decides which
// status transitions are legal. NEW can only reach DISQUALIFIED directly;
// LOST is reachable from VALIDATED onward, never from NEW ("never became a
// real lead" is DISQUALIFIED's job, distinct from "was real, didn't
// convert"). CONVERTED/LOST/DISQUALIFIED are terminal.
//
// Lives in its own module (not inside CrmLeadService) so both CrmLeadService
// (user-facing CRUD) and CrmAutomationIngestService (n8n write-back surface)
// can import it without creating a circular dependency between the two —
// they're deliberately kept separate (different callers/auth), but both
// need to be the same single lifecycle authority.
export const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["VALIDATED", "DISQUALIFIED"],
  VALIDATED: ["AI_ANALYZED", "LOST"],
  DISQUALIFIED: [],
  // DISQUALIFIED added to AI_ANALYZED's targets in Sprint 5 — a
  // LOW-confidence AI qualification result auto-routes here too
  // (CrmAutomationIngestService), reusing the same terminal state NEW's
  // dedup/invalid path already lands on rather than introducing a second
  // "not pursuing this lead" status.
  AI_ANALYZED: ["QUALIFIED", "DISQUALIFIED", "LOST"],
  QUALIFIED: ["CONTACTED", "LOST"],
  CONTACTED: ["NEGOTIATION", "LOST"],
  NEGOTIATION: ["CONVERTED", "LOST"],
  CONVERTED: [],
  LOST: [],
};
