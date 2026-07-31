# ADR-0018 — CRM Foundation: Shared-Workspace Leads, Server-Enforced Lifecycle, Platform-Wide Execution Log

## Context

Sprint 1 introduces **CRM Foundation** — a new module inside EYAN AI Platform whose first shipped capability is manual lead management (create, list, detail, status, assignment, notes). It is explicitly positioned as a foundation, not a point solution: `docs/product/02_ROADMAP.md` lists CRM as out of scope for Version 1.0, and this sprint begins a parallel initiative rather than resuming that scope. A full Technical Design Document (`/home/eyancantimbuhan/.claude/plans/project-ai-sales-clever-dijkstra.md`) was reviewed and frozen before implementation began (its own Phase 0.5 review section records the product-positioning, schema, and naming decisions this ADR reflects).

The eventual goal — recorded here so it isn't lost — is AI-assisted lead qualification via a separate self-hosted n8n instance (`eyan-automation-hub`), communicating with this backend only over signed webhooks and a service-authenticated API, never a shared database. **None of that automation is built in Sprint 1.** This ADR is scoped to what Sprint 1 actually built: the data model, the lifecycle rules, and the CRUD surface those future sprints will build on.

## Decision 1: Shared workspace, single `crm` permission — no per-lead ownership

`Lead` has no `userId`/owner column used for access control, the same posture Finance (`ADR-0013`) already established: any user holding the `crm` permission sees and edits every lead. `assignedToId` records who is responsible for a lead, but is never used to filter or gate access — a sales team seeing the same pipeline is the whole point. `Lead`, `LeadActivity`, and `LeadAiAnalysis` all carry a nullable, unused `organizationId` column following the exact `Expense.householdId` future-proofing precedent — no `Organization` model exists yet and none is built here, but the column is free to add now and expensive to retrofit later.

**Alternative considered and rejected**: per-user lead ownership (mirroring `ContentProject.userId`, ADR-0007). Rejected — a lead pipeline a rep can't see because someone else is assigned to it defeats the purpose of a shared sales workspace; this is structurally the Finance case, not the Content Studio case.

## Decision 2: `LeadActivity` is one table serving both "Activity History" and "Automation History"

`LeadActivity.type` (`NOTE`/`STATUS_CHANGE`/`ASSIGNMENT`/`AI_ANALYSIS`/`AUTOMATION`) discriminates a single chronological timeline, filtered by type in the UI rather than split into two tables backed by two queries. Sprint 1 only ever writes `NOTE`, `STATUS_CHANGE`, and `ASSIGNMENT` rows (all rep-driven, `actorId` always set); `AI_ANALYSIS`/`AUTOMATION` rows are reserved for when n8n integration begins (`actorId` null, system-originated) — the enum value existing now means that sprint doesn't need a migration to start writing them.

## Decision 3: Status changes are never fire-and-forget — the activity write is awaited, not best-effort

`CrmLeadService.updateStatus()`/`.assign()` await the paired `LeadActivity` write and let its failure propagate as a real error, unlike Finance's `FinanceAuditService.record()` calls (deliberately fire-and-forget, `.catch(logger.error)`, since that's a supplementary audit trail). `LeadActivity` is different: it *is* the user-visible timeline the Lead Detail page renders, so `docs/standards/IMPLEMENTATION_RULES.md`'s "nothing changes silently" applies to it directly, not just to a security audit log.

**Known limitation, not fixed this sprint**: the `Lead` update and the `LeadActivity` create are two sequential repository calls, not one database transaction — no cross-repository `$transaction` pattern exists anywhere in this codebase yet (confirmed by search), and introducing one for a single call site would be new architecture the sprint's scope doesn't justify. Acceptable at v1's write-concurrency (a human clicking a button), revisit if a real partial-failure incident occurs.

## Decision 4: `LeadAiAnalysis` and `WorkflowExecutionLog` exist in the schema now, populated by nothing until Sprint 2/3

Both models are part of this migration even though Sprint 1 has no AI orchestration and no n8n integration — the alternative (adding them in a second migration once automation work begins) is strictly worse: the Lead Detail page's "AI Analysis" section and the Automation module's future "Automation Runs" page can be built against a stable contract today, and a lead created in Sprint 1 doesn't need to be migrated or backfilled when Sprint 2/3 start writing to these tables. Nothing in Sprint 1 writes to either table; both render an honest empty state.

`WorkflowExecutionLog.domain` (default `"crm"`) exists from day one rather than being added when a second automation domain shows up — per the Phase 0.5 TDD review, this is what makes the table (and its future dedicated Automation Runs page, living in the Automation module, not CRM) reusable by support/recruitment/invoicing automation later without a rename.

## Decision 5: Server-enforced lifecycle, five fields matching the TDD's AI JSON schema, `salesStageRecommendation` deliberately not built

`ALLOWED_TRANSITIONS` in `CrmLeadService` is the single source of truth for legal status transitions (`NEW → VALIDATED → AI_ANALYZED → QUALIFIED → CONTACTED → NEGOTIATION → CONVERTED`, `LOST` reachable from `VALIDATED` onward, `NEW → DISQUALIFIED` as the only path out of `NEW`) — the frontend's `lead-lifecycle.ts` is a display-only copy (which statuses to show in the dropdown), the same client/server duplication Finance's zod schema + `express-validator` pair already established. `LeadAiAnalysis` carries the five fields the TDD's Phase 0.5 review added (`buyingIntent`, `urgency`, `decisionMakerIdentified`, `estimatedTimeline`, `riskLevel`) — the review's rejected sixth field, `salesStageRecommendation`, was never added to the schema either, since it would create a second authority over "what stage is this lead at" alongside this exact transition map.

## Decision 6: The public Lead Form endpoint is unauthenticated by design, not an oversight

`POST /api/v1/crm/leads` has no `authenticate` middleware — it's the intended public submission target — but does have a dedicated `express-rate-limit` instance (20 requests/15 min/IP, a new minimal dependency) and full `express-validator` validation/sanitization, since this is the actual internet-facing attack surface given the host's disabled firewall (ufw off; nginx binding is the real perimeter, per the TDD's Security Model). The service-facing, n8n-authenticated routes described in the TDD (`authenticateService`, `AUTOMATION_SERVICE_API_KEY`/`AUTOMATION_WEBHOOK_SIGNING_SECRET`) are **not built this sprint** — Sprint 1's brief explicitly excluded Automation/Webhooks, so that middleware and those routes are deferred to Sprint 2 ("Cross-System Skeleton"), a sequencing change from the TDD's original sprint plan (which had them in Sprint 1) but not an architectural one — nothing about their eventual design changes.

## Consequences

- A future real n8n integration adds `LeadAiAnalysis`/`WorkflowExecutionLog` write paths and the service-facing route/middleware without touching the `Lead`/`LeadActivity` schema or the lifecycle transition map.
- A future Sales Workspace pillar (Contacts, Companies, Deals) adds nullable `contactId`/`companyId` FKs to `Lead` alongside its existing flat fields — additive, not breaking.
- Adding a second automation domain (support, recruitment, invoicing) reuses `WorkflowExecutionLog` via a new `domain` value and the same eventual Automation Runs page, rather than each domain inventing its own execution-log table.
