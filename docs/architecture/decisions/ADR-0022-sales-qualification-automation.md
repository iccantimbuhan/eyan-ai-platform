# ADR-0022: Sales Qualification Automation (AI Core Phase 3 + CRM Pipeline Automation)

- Status: Accepted
- Date: 2026-08-02
- Authors: Claude Code

---

# Context

ADR-0021 (AI Core Foundation) named two follow-on phases and explicitly deferred both, requiring separate approval: **Phase 2** (migrate existing in-process callers — `ContentService` et al. — to Capabilities) and **Phase 3** (re-point `eyan-automation-hub` Workflow 3 at `POST /ai-core/capabilities/lead-qualification/invoke` instead of calling Ollama directly). Phase 2 was already done by the time this sprint started (`ContentService`, `VideoWorkflowPlannerService`, `VideoAssetService` all call `AiCapabilityService.invoke()`). Phase 3 had not — `eyan-automation-hub`'s Workflow 3 still called Ollama directly, and the seeded `lead-qualification` Capability (`prisma/seed-ai-core.ts`, matching `eyan-automation-hub`'s own prompt file field-for-field) had never actually been invoked by any code path. This is that approval, executed.

Separately, a sprint brief ("AI Sales Qualification & CRM Automation") asked for the CRM side this unlocks: automatic pipeline routing by AI confidence, activity creation from AI recommendations, a manual review queue for uncertain results, and a handoff to a new n8n sales-automation workflow — none of which existed. `CrmAutomationIngestService.applyQualificationResult()` already existed (Sprint 2/3) as the n8n write-back receiver, but always landed a lead at `AI_ANALYZED` regardless of confidence, with no further routing and no downstream notification.

---

# Decision

**AI Core Phase 3, executed as originally scoped, one addition.** A new route group, `POST /api/v1/ai-core/service/capabilities/:capabilityKey/invoke` (`ai-core-service.routes.ts`), gated by the existing `authenticateService` middleware — the exact extension point `ai-capability.controller.ts`'s own Phase 1 comment named ("mirroring how CRM's own /crm/service/* routes were added as a separate, later route group"). The human-JWT route (`ai-core-capabilities.routes.ts`) is untouched; ADR-0021's "architecture frozen" holds. `AiCapabilityController.invokeService()` is a thin sibling of `invoke()` differing only in `actorId: null` (no `req.user` — the caller is n8n, not a person, same distinction `CrmAutomationIngestService` already draws from `CrmLeadService`).

**Pipeline auto-routing is confidence-tier-driven, additive to the existing contract.** `ApplyQualificationResultDto` gains one optional field, `confidenceTier` (`AiInvokeResult.confidence`'s own `"HIGH"|"MEDIUM"|"LOW"`, sourced from AI Core — never recomputed CRM-side, avoiding a second copy of `AiRoutingPolicy`'s threshold logic). `CrmAutomationIngestService.applyQualificationResult()` performs the existing `AI_ANALYZED` write unchanged, then a **second, conditional** transition: `HIGH → QUALIFIED`, `LOW → DISQUALIFIED`, `MEDIUM`/missing → stays at `AI_ANALYZED` (itself the review bucket — `needsManualReview` already renders there in the UI). This required one small, deliberate addition to the shared transition table: `AI_ANALYZED → DISQUALIFIED` (previously only `NEW`'s dedup/invalid path reached `DISQUALIFIED`). Reusing the existing terminal status rather than introducing a new one keeps `LeadStatus` unchanged — satisfies "reuse existing pipeline configuration, do not hardcode" literally, since the *thresholds* driving the routing already live in `AiRoutingPolicy`, not in this code.

**The shared transition table moved out of `CrmLeadService` into its own module (`crm-lead-transitions.ts`).** `CrmLeadService` now also needs `CrmAutomationIngestService` (for `rerunQualification`, below), and `CrmAutomationIngestService` already needed `ALLOWED_TRANSITIONS` from `CrmLeadService` — importing in both directions would create a circular module dependency, with a real, order-dependent TDZ crash risk on the pair's default-constructed singleton exports (confirmed by tracing both import orders during implementation). Extracting the table to a third, dependency-free module breaks the cycle without changing its meaning: still one shared authority, both services import it, neither depends on the other for it.

**Manual Review Queue reuses existing surfaces wherever one already fit.** `AI_ANALYZED` status *is* the queue (no new list/filter endpoint — `GET /crm/leads?status=AI_ANALYZED` already worked). Accept/Reject reuse the existing `PATCH /crm/leads/:id/status` endpoint (Reject is only newly *legal* because of the transition-table addition above, not new code). Edit reuses the existing lead-edit endpoint/dialog. The one genuinely new piece is **Re-run AI Qualification** (`POST /crm/leads/:id/qualification/rerun`): `CrmLeadService` now calls `AiCapabilityService.invoke("lead-qualification", ...)` **in-process** (the same pattern `ContentService` established in Phase 2 — ADR-0021), maps the result into the same `ApplyQualificationResultDto` shape Workflow 3 produces, and delegates persistence to a new `CrmAutomationIngestService.rerunQualification()` method. That method and `applyQualificationResult()` both call a shared private `persistAnalysisAndRoute()` — one implementation of "record a new `LeadAiAnalysis` and act on it," regardless of whether the caller is n8n's write-back or a human's re-run click. `rerunQualification()`'s precondition differs from `applyQualificationResult()`'s (it must start `AI_ANALYZED`/`QUALIFIED`/`DISQUALIFIED` — already qualified once — rather than `VALIDATED` for the first time), since a rerun is a correction, not an initial transition.

**Sales-automation handoff is a new webhook event, not a new dispatcher.** `AutomationWebhookService` (ADR-0019, "a future automation domain adds its own event, not its own dispatcher") gains `dispatchLeadQualified()` — same fire-and-forget/HMAC-signed pattern as `dispatchLeadIntake()`, refactored to share a `postSigned()` helper. Fired from `persistAnalysisAndRoute()` after the pipeline transition and Activity writes are complete — the payload's `pipelineStage` is EYAN's own already-final decision, not a request for n8n to compute one, keeping "n8n orchestrates, CRM decides" intact for the new `eyan-automation-hub` Workflow 4 this unblocks.

**No Prisma migration.** Every field this sprint needed either already existed (`LeadAiAnalysis`'s near-complete column set, `LeadStatus`/`LeadPriority` enums) or fits in an existing `Json` column (`LeadAiAnalysis.rawResponse` now also carries AI Core's routing metadata verbatim — brain, outcome, retryCount, latencyMs — satisfying the audit-trail requirement without a new column). `AiUsageLog` is written automatically by `AiRoutingService.execute()` the moment the new service route is used — the audit trail's per-invocation half was already fully built by ADR-0021, just unreachable until this ADR's route existed.

---

# Alternatives Considered

**Re-point Workflow 3 by having EYAN call AI Core and then push the result to n8n**, rather than n8n calling AI Core. Rejected — the existing Workflow 1 → 2 → 3 chain (webhook intake, validation, dedup) already does real, working CRM-adjacent business logic that would either be duplicated in EYAN or discarded; ADR-0021 Phase 3 was already scoped as "n8n calls AI Core," and nothing about this sprint's findings changed that calculus. The brief's own flow diagram is compatible with either reading; this one required the least disruption to already-approved, working architecture.

**Recompute the confidence tier CRM-side from the raw numeric `confidence` field**, avoiding a new DTO field. Rejected — `AiRoutingPolicy`'s thresholds are the single source of truth for tier computation (ADR-0021); duplicating that arithmetic in `CrmAutomationIngestService` risks silent drift between the two if a policy's thresholds ever change. An additive, optional DTO field costs nothing and keeps tier computation in exactly one place.

**A new `salesStageRecommendation`-style field or a fully separate "review status" enum.** Rejected on the same grounds ADR-0018 Decision 5 already rejected a similar field: a second authority over pipeline stage invites drift from the one the UI/API actually enforce (`LeadStatus` + `ALLOWED_TRANSITIONS`). Reusing `AI_ANALYZED` as the review bucket and `DISQUALIFIED` as the auto-reject target keeps one authority.

**A full salesperson-routing engine (round-robin, territory, skill-based) for Workflow 4's "assign salesperson" step.** Rejected as out of scope — no such system exists anywhere in either repo to extend, and speculatively building one wasn't asked for by anything beyond the brief's example bullet list. A single configurable `DEFAULT_SALES_OWNER_ID` is the v1 stand-in; flagged as technical debt, not silently built as if complete.

---

# Consequences

- **Frozen, alongside ADR-0021**: the human-JWT `/ai-core/capabilities/*` route remains untouched; the new `/ai-core/service/*` group is the only service-auth surface for Capability invocation, mirroring `/crm/service/*` exactly. A future Phase 4 (if any) should follow the same "separate route group, not a folded-in auth branch" pattern.
- `ALLOWED_TRANSITIONS` now lives in `crm-lead-transitions.ts`, re-exported from `crm-lead.service.ts` for backward compatibility — any future import should prefer the new module directly.
- **Known limitation, acceptable for this sprint**: salesperson assignment is a single default owner, not a routing engine. Building one is new scope, not a repointing, and should get its own explicit approval if requested.
- **Known limitation, acceptable for this sprint**: `AiUsageLog` still has no `confidence`/`promptVersion` column (noted, not fixed, in ADR-0021's own review) — querying usage by confidence tier requires joining through `LeadAiAnalysis.rawResponse` rather than a direct column. Flagged again here since this sprint's audit-trail requirement made the gap concrete rather than theoretical.
- **Known limitation**: the "follow-up after X days" requirement is satisfied by an `AUTOMATION` `LeadActivity` with a computed due-date in `metadata`, not an actual scheduled reminder-sender — no scheduling infrastructure exists in either repo, and building one is new scope.
- eyan-automation-hub's Workflow 3 and the new Workflow 4 are covered separately in that repo's own `docs/development-log/sprint-4-sales-automation.md`.

# Operational Notes (Sprint 5.1)

Sprint 5 built this architecture but never turned it on end-to-end against real, live infrastructure — no public lead form existed, the live n8n instance still ran the pre-Sprint-5 Workflow 3, Workflow 4 had never been imported, and both webhook env vars connecting the chain (`AUTOMATION_HUB_WEBHOOK_URL`, `AUTOMATION_HUB_LEAD_QUALIFIED_WEBHOOK_URL`) were empty. Sprint 5.1 (`tasks/completed/sprint-5-1-website-lead-form-slack-verification.md`) closed those gaps: built the missing lead-capture page, imported/activated all four CRM workflows, wired the webhook URLs to `http://localhost:5678/...` (same box as n8n — no reason to round-trip through the public domain for internal traffic), set a real `DEFAULT_SALES_OWNER_ID` (the platform's own Owner account, resolved via `GET /api/v1/users` rather than guessed), and set a real `SLACK_WEBHOOK_URL`. None of this changed any code decided above — it only made the already-approved architecture reachable for the first time, and proved it live: a real lead flowed unattended through intake → validation → AI qualification → pipeline routing → salesperson assignment → a real Slack message, twice, confirmed against real database rows and real n8n execution records.

One incidental discovery worth recording here: this host runs `eyan-backend` under **two** process managers — a systemd service (the one actually bound to port 3001, matching `deploy.sh`'s own restart command) and a stray, unrelated pm2-managed process that does nothing for real traffic. Restarting the pm2 process (as this session initially did, repeatedly) silently has no effect on production behavior. Not resolved this sprint — flagged as remaining technical debt, since removing one without understanding why both exist felt like the wrong call to make unilaterally.

# Related Documents

- `docs/architecture/decisions/ADR-0021-ai-core-foundation.md` (the architecture this ADR executes Phase 3 of)
- `docs/architecture/decisions/ADR-0018-crm-foundation.md` (pipeline-stage-single-authority precedent, Decision 5)
- `docs/architecture/decisions/ADR-0019-automation-integration-contract.md` (webhook dispatch pattern, "new event not new dispatcher")
- `eyan-automation-hub` `docs/development-log/sprint-4-sales-automation.md`, `docs/workflows/03-ai-qualification.md`, `docs/workflows/04-sales-automation.md`
