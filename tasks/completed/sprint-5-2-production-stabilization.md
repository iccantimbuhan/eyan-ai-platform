# Sprint 5.2 — Production Stabilization: AI Sales Qualification Pipeline

Status: Complete

Date: 2026-08-02

---

## 1. Executive Summary

The pipeline was not broken where it looked broken. AI Core was invoked correctly, the Sales Brain resolved correctly, the active Routing Policy was used correctly, and Ollama ran the correct model and returned a valid, structured qualification result — every single time. The actual failure was one hop later: the CRM write-back endpoint (`PATCH /crm/service/leads/:id/qualification`) rejected a value the AI Core prompt schema doesn't currently prohibit but a real model can legitimately produce (`buyingIntent: "UNKNOWN"`), returning HTTP 400. That is n8n's "Bad request - please check your parameters." The "Gemma never loads" symptom was a real observation but not a bug — it was a snapshot taken in the few minutes between creating a new Ollama routing policy and activating it; a live, controlled test proved routing correctly uses whichever policy is actually active, with no caching or staleness involved.

While validating the fix live, a second, independent, previously-undiscovered bug surfaced: Workflow 4's Slack (and by the same mechanism, Email) notification step referenced `$json` for lead/qualification data, but `$json` had already been overwritten by the "Assign Salesperson" HTTP node's own response by the time Slack's node ran — meaning notifications had likely never worked through the real assignment path, only through isolated/skipped-assignment test paths. Both bugs are now fixed, live, and proven end-to-end four separate times against real production traffic — including one run driven by an actual headless-browser visit to `https://eyan.fyi/contact`, filling and submitting the real form, with zero manual backend calls or database writes in that final proof.

## 2. Root Cause Analysis

**Root cause #1 — the pipeline blocker.** `Lead.buyingIntent`/`urgency`/`riskLevel` are backed by the Prisma `QualificationLevel` enum (`LOW | MEDIUM | HIGH` — `backend/prisma/schema.prisma:1098`). The CRM write-back validator (`applyQualificationResultValidator`, `backend/src/validators/crm-automation.validator.ts`) rejected anything outside that set. A real model output legitimately contains `buyingIntent: "UNKNOWN"` when there isn't enough signal to classify — the exact same situation `estimatedTimeline` already has a dedicated `UNKNOWN` enum member for, but `buyingIntent`/`urgency`/`riskLevel` never got one. Confirmed with the actual failing response body, decoded from n8n's own execution history:

```
400 - {"success":false,"errors":[{"type":"field","value":"UNKNOWN","msg":"Invalid buyingIntent.","path":"buyingIntent","location":"body"}]}
```

paired with the AI Core response that produced it — a fully valid, structured qualification (`leadScore: 20, confidence: 0.2, buyingIntent: "UNKNOWN", estimatedTimeline: "UNKNOWN", ...`). AI Core, the Sales Brain, the active Routing Policy, and Ollama all did their job correctly; the CRM's own write-back contract couldn't accept the result.

**Root cause #2 — "Gemma never appears in `ollama ps`," fully explained, not a bug.** Cross-referencing exact timestamps (n8n's `execution_entity`, which stores explicit `+02` offsets, against `eyan-ai-platform`'s own `AiUsageLog`/`AiAuditEvent`, confirmed empirically to store UTC by comparing a live test against the wall clock): the specific failing run the symptom was observed on **started and finished before** the new Gemma-preferred `AiRoutingPolicy` was even activated (execution ended 18:47:36 CEST; the policy's `ROUTING_POLICY_CHANGED` audit event fired at 18:51:28 CEST — four minutes later). The old, still-active `qwen2.5-coder:7b` policy was legitimately used. A live, controlled re-test after activation (`POST /ai-core/service/capabilities/lead-qualification/invoke`, watched via `ollama ps` in real time) resolved and ran `gemma3:4b` correctly, with `AiRoutingService`'s resolution code (`getResolvedChain` → `AiRoutingPolicyRepository.findActiveByBrain`) read and confirmed to filter strictly on `isActive: true` — no stale cache, no wrong Brain/Capability mapping, no cached configuration.

**`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` — confirmed not the cause, real but separate.** It fired at the very start of the request chain (the initial public `POST /crm/leads`, which is rate-limited), a full workflow-chain away from where the actual 400 occurred (the qualification write-back, several minutes later, a different HTTP call). It's express-rate-limit's own warning that Express's `trust proxy` setting was never configured despite running behind nginx — real, but provably unrelated to this failure. Fixed alongside the primary fix since it's a one-line, low-risk correctness gap (see §4).

**Root cause #3 — discovered during live validation, not in the original symptom report.** Workflow 4's "Send Slack Notification" (and, by the identical mechanism, "Send Email Notification") node built its message from `$json.lead`/`$json.qualification`/`$json.pipelineStage`. In n8n, `$json` refers to the *immediately preceding* connected node's output — and the node immediately before Slack, on the real path (`Assign Salesperson` → `Slack Configured?` → `Send Slack Notification`), is `Assign Salesperson`, whose own HTTP response (`{ success, message, data: {...lead} }`) has no `lead`/`qualification`/`pipelineStage` keys at all. Every reference to `$json.lead.contactName` etc. therefore resolved against the wrong object, and n8n reported the resulting failure generically as `"The value in the \"JSON Body\" field is not valid JSON"` — regardless of the real underlying cause. This was invisible in isolated diagnostic tests that skipped the assignment step (by pre-setting `assignedToId`), which is exactly why it hadn't been caught before — Sprint 5.1's own "Slack confirmed" claim was based on one direct webhook curl plus one workflow-driven run that was never independently checked for this failure mode.

## 3. Investigation Process

Traced the exact request path using n8n's own execution history (`execution_entity`/`execution_data` in the automation-hub's Postgres) rather than assumptions:

1. Confirmed the live n8n instance runs the genuine Sprint 5 3-node Workflow 3 (`POST /ai-core/service/capabilities/lead-qualification/invoke`, not Ollama directly) — re-verified node-by-node (URL, auth, headers, body).
2. Found the real failing execution chain (n8n execution ids 29–32) and decoded n8n's compact/pointer-referenced execution-data JSON to recover the literal HTTP request/response bodies at each node — this is what surfaced the exact 400 response and the exact AI Core output that triggered it.
3. Queried `AiCapability`/`AiBrain`/`AiRoutingPolicy`/`AiModel`/`AiProvider` directly to confirm the capability → brain → policy → model chain was unambiguous at the database level (only one `isActive: true` policy at any moment).
4. Read `AiRoutingService`'s resolution code end-to-end (`invokeCapability` → `getResolvedChain` → `execute` → `attempt`) to confirm no hidden override or env-var fallback exists — the resolved `AiModel.modelKey` is what's actually sent to Ollama, verbatim.
5. Cross-referenced exact timestamps between n8n (`+02`) and the CRM database (confirmed UTC via a live, timestamped test) to resolve the Gemma/qwen sequencing question definitively.
6. Ran a live, isolated diagnostic call directly against the AI Core service route while polling `ollama ps` in real time — proved routing correctly resolves and runs the active policy's model.
7. Checked `journalctl` for the exact request that produced `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` and confirmed by timestamp it belongs to a different, earlier, successful request than the one that actually failed.
8. After deploying the fix, ran a real headless-browser (Playwright) visit to `https://eyan.fyi/contact` — no manual backend calls — and traced the resulting execution chain the same way; this is what surfaced root cause #3, since the browser-driven path exercises `Assign Salesperson` (assignedToId starts `null`), which my own earlier isolated diagnostic tests had inadvertently skipped.
9. Iterated three times against the real n8n instance (fast, signed direct-webhook diagnostic calls to isolate the Slack-node fix specifically, before re-running the full multi-minute AI chain) until a real Slack `"ok"` response was obtained on the actual assignment-then-notify path, then re-confirmed via one final, complete, unmodified browser-driven run.

No temporary debug logging was added to any source file — n8n's own execution history and the existing `AiUsageLog`/`WorkflowExecutionLog`/`LeadActivity` audit trail were sufficient to trace every step precisely.

## 4. Files Modified

**eyan-ai-platform** (`dev` branch):

- `backend/src/dto/crm-automation.dto.ts` — widened `buyingIntent`/`urgency`/`riskLevel` types to `QualificationLevel | "UNKNOWN"`.
- `backend/src/validators/crm-automation.validator.ts` — `buyingIntent`/`urgency`/`riskLevel` now accept `"UNKNOWN"` in addition to `LOW|MEDIUM|HIGH` (not `confidenceTier`, which is AI Core's own computed tier and never `"UNKNOWN"`).
- `backend/src/services/crm-automation-ingest.service.ts` — new `normalizeQualificationLevel()` helper; `persistAnalysisAndRoute()` (the single method both the n8n write-back and the human "Re-run AI Qualification" path funnel through) now coerces `"UNKNOWN"` to `null` before the Prisma write, since the DB column is the 3-value enum and cannot store it directly.
- `backend/src/services/crm-lead.service.ts` — widened `LeadQualificationOutput`'s matching fields for type accuracy (the re-run path builds the same DTO from raw AI Core output).
- `backend/src/app.ts` — `app.set("trust proxy", 1)` (see root cause discussion above; real but non-blocking gap, fixed alongside).
- `backend/src/validators/crm-automation.validator.test.ts`, `backend/src/services/crm-automation-ingest.service.test.ts` — new test coverage (see §8).
- `tasks/completed/sprint-5-2-production-stabilization.md` — this report.

**eyan-automation-hub** (`main` branch):

- `workflows/crm/04-sales-automation.json` — "Send Slack Notification" and "Send Email Notification" now build their message from `$('Verify & Parse').item.json` instead of bare `$json`, matching the pattern Workflow 3's own "Map AI Core Result" node already established (`$('Load Config').item.json`) for exactly this "need data from an earlier node, not the immediately-preceding one" situation. No other workflow files changed — Workflows 1–3 were investigated and confirmed already correct.

No Prisma migration. No AI Core, CRM, Routing Engine, or Workflow *architecture* change — every fix is either a validation-boundary widening, a normalization step, a one-line proxy-trust setting, or a node-reference correction inside an already-existing workflow.

## 5. Code Changes

**`normalizeQualificationLevel` (new, `crm-automation-ingest.service.ts`):**

```ts
function normalizeQualificationLevel(
  value: QualificationLevel | "UNKNOWN" | undefined
): QualificationLevel | null {
  if (!value || value === "UNKNOWN") return null;
  return value;
}
```

Applied to `buyingIntent`/`urgency`/`riskLevel` in `persistAnalysisAndRoute()`, replacing the previous `data.buyingIntent ?? null` pass-through.

**Validator (`crm-automation.validator.ts`):**

```ts
const QUALIFICATION_LEVELS_OR_UNKNOWN = [...QUALIFICATION_LEVELS, "UNKNOWN"];
// buyingIntent/urgency/riskLevel use QUALIFICATION_LEVELS_OR_UNKNOWN;
// confidenceTier still uses QUALIFICATION_LEVELS (unchanged).
```

**`app.ts`:**

```ts
app.set("trust proxy", 1);
```

**`04-sales-automation.json` (Slack node, representative — Email node changed identically):**

Before:
```
"jsonBody": "={{ JSON.stringify({ text: `...${$json.lead.contactName}*...` }) }}"
```

After:
```
"jsonBody": "={{ JSON.stringify({ text: ':dart: Lead qualified: *' + $('Verify & Parse').item.json.lead.contactName + '*' + ... }) }}"
```

(Full expression in the file itself — every `$json.*` reference replaced with `$('Verify & Parse').item.json.*`.)

## 6. Validation Steps

- `pnpm --filter backend test` — 871/871 passing (867 baseline + 4 new).
- `pnpm --filter backend typecheck` — clean.
- `pnpm --filter backend build` — clean.
- `node tests/workflows/crm/03-ai-qualification.logic.test.js` — 25/25 (re-confirmed unchanged).
- `node tests/workflows/crm/04-sales-automation.logic.test.js` — 19/19 (re-confirmed unchanged — this suite covers Code-node JS logic, not the HTTP-node expression fixed here, which has no equivalent harness; validated live instead, see §7).
- Backend deployed: `pnpm --filter backend build` (source unchanged elsewhere, no migration) + `sudo systemctl restart eyan-backend` (run by the user — no sudo access this session).
- Workflow 4 re-imported and reactivated on the live n8n instance three times over the course of isolating and fixing the Slack node's actual root cause; final state confirmed active.

## 7. Live Production Verification

Per the brief's explicit constraint — no mocked requests, no manual backend endpoint calls, no manual database rows for the validation itself — the final proof was a real headless-browser (Playwright, already a project dependency) visit to the actual public site:

1. Navigated to `https://eyan.fyi/contact`, filled the real form fields, clicked "Send Message" — exactly what a visitor does.
2. `POST /api/v1/crm/leads` → **201**, confirmation panel rendered.
3. Traced the resulting real n8n execution chain (ids 54–57): Workflow 1 → 2 → 3 (real AI Core → real Ollama call, ~2–3 minutes) → 4, **all four `status: success`**.
4. Final lead state: `DISQUALIFIED`, score 15, priority LOW, `assignedToId` set to the real Owner account.
5. Slack node's own recorded output for this exact run: `{"data": "ok"}` — Slack's real API response.
6. **User-confirmed** the Slack notification for this final run actually arrived.
7. Full audit trail confirmed present and correctly correlated: `LeadAiAnalysis`, 4 `LeadActivity` rows (`STATUS_CHANGE`, `AI_ANALYSIS`, `AUTOMATION`, `ASSIGNMENT`), `WorkflowExecutionLog` × 3, `AiUsageLog` (correct capability/provider/model/latency).
8. All test data (5 leads created across the investigation and validation cycles) deleted afterward via direct SQL — confirmed zero residue.

This exact sequence — real browser submission → real 4-workflow chain → real Slack delivery, user-confirmed — was reproduced twice after the Slack fix (once mid-investigation to isolate the cause, once as the final, unmodified end-to-end proof) and once before it (to first prove the qualification-pipeline fix alone, before the Slack bug was even known).

## 8. Test Results

New backend test coverage, both added to already-existing suites (no new files):

- `crm-automation.validator.test.ts`: accepts `"UNKNOWN"` for `buyingIntent`/`urgency`/`riskLevel`; still rejects a genuinely invalid value.
- `crm-automation-ingest.service.test.ts`: `persistAnalysisAndRoute` normalizes `"UNKNOWN"` → `null` for all three fields; still persists a real `LOW`/`MEDIUM`/`HIGH` value unchanged.

Full results: backend 871/871, frontend unaffected (no frontend files changed this sprint), automation-hub logic suites 25/25 + 19/19.

## 9. Remaining Technical Debt

- **The live AI Core prompt still tells the model `buyingIntent`/`urgency`/`riskLevel` must be exactly `LOW|MEDIUM|HIGH`** (confirmed by reading the actual live `AiPrompt` row, not just the seed file) — a real model still occasionally deviates from this instruction (observed twice this session). The CRM side is now robust to it regardless, but the prompt itself was not tightened or given an explicit `UNKNOWN` option (unlike `estimatedTimeline`, which already has one) — deliberately out of scope, since AI Core's prompt content is a data/config change with its own review surface, not something to touch inside a "fix the CRM's own boundary" sprint. Flagged as a candidate for a future, explicit AI Core content pass.
- **The Email notification step remains genuinely untested** — the `$('Verify & Parse')` reference fix was applied to it by direct pattern analogy to the now-confirmed Slack fix, but no SMTP credential exists in this environment, so it has never actually run. Recommend live-testing once real SMTP credentials are available (already an open item from Sprint 5).
- **Two process managers were already flagged in Sprint 5.1's report** (a systemd service actually serving production traffic, and an unrelated stray pm2 process) — unchanged this sprint, still unresolved, still worth a deliberate cleanup decision.
- **Production `JWT_SECRET`/`REFRESH_TOKEN_SECRET` placeholder values** — also already flagged in Sprint 5.1's report, unchanged, still a real gap.
- **No automated test coverage exists for n8n HTTP-node body expressions** (as opposed to Code-node `jsCode`, which the existing `vm`-based harness does cover) — this is exactly the class of bug that slipped through undetected in Sprint 5.1 (an n8n-expression-evaluation quirk, not a JS logic bug, so the existing harness couldn't have caught it). No general-purpose way to unit-test this class of n8n behavior exists in this codebase; the only reliable check is a live execution, which is what this sprint's validation methodology now establishes as the standard for any future HTTP-node change in these workflows.

## 10. Recommendations

1. Consider adding `"UNKNOWN"` as an explicit, documented option for `buyingIntent`/`urgency`/`riskLevel` in the live AI Core prompt (matching `estimatedTimeline`'s existing precedent) as a future, separately-reviewed content change — would reduce (not eliminate — the CRM-side fix stays regardless) how often the model needs the fallback this sprint added.
2. Live-test the Email notification path once real SMTP credentials exist; the fix is already in place by analogy but unverified.
3. Resolve the pm2/systemd duplicate-process situation (Sprint 5.1 recommendation, still open).
4. Rotate the production JWT/refresh secrets (Sprint 5.1 recommendation, still open).
5. When changing any future n8n HTTP-node body/header expression in these workflows, validate via a live execution (direct signed-webhook call for speed, or the full chain) rather than trusting the existing Code-node logic-test suite alone — it cannot see this class of bug.
