# Sprint 4 Readiness Report

Prepared: 2026-07-24, at the close of Sprint 3 (including its post-deployment production incident). Candidate next feature named so far: AI Image Generation — not scoped or started.

---

## Completed Work

- **Sprint 2 — Content Studio: Templates & Generation UX**: Prompt Templates, Template Picker, variable substitution, generation history polish. (`tasks/completed/sprint-2-templates-and-picker.md`)
- **Sprint 3 — Prompt Library Foundation**: `SavedPrompt` backend with enforced per-user ownership (ADR-0006, the first genuinely enforced ownership model in the codebase, live-verified with real cross-user attempts), full frontend (Prompt Library page, reuse-in-generator integration), and the six accepted Sprint 2 follow-up items. (`tasks/completed/sprint-3-prompt-library.md`)
- **Content Studio polish pass**: fixed a false "Generation Failed" UI bug (frontend timeout too short for real generation time), fixed `ProjectWorkspace`'s layout to match the rest of the app (it was the only page skipping the shared `Header`/`Main` shell), added collapse/expand and delete-confirmation to Generation History.
- **Production incident, fully resolved**: a three-layer timeout mismatch (frontend → backend → nginx) surfaced on the first real production deploy of this sprint's work. All three layers are now aligned (frontend/backend at 300s-equivalent, nginx at 330s), and `deploy.sh` now automatically warms the Ollama model after every deploy so the cold-start condition that triggered part of this incident can't recur. Full timeline and root-cause chain in `tasks/completed/sprint-3-prompt-library.md`.
- **Operations playbook updated** (`.claude/engineering/10_OPERATIONS.md`) with the lessons from this incident: reverse-proxy timeouts must be checked against the backend's own AI timeout, and deploys must warm the model — so this class of issue is checked for by default on future sprints, not just remembered informally.

Production is confirmed healthy and running all of the above as of this report.

---

## Known Limitations

- **No per-user ownership on `ContentProject`/`GeneratedContent`** — any authenticated user can read or delete any other user's project or generated content by ID. `SavedPrompt` is the only model with this enforced so far (ADR-0006 deliberately did not retrofit the older models).
- **No CI/CD auto-deploy** — `deploy.sh` is manually triggered, requires sudo privileges, and there's no automated gate (build/test/lint) before a deploy runs.
- **Generation is slow and highly variable on current hardware** — CPU-only, 11GB RAM. Measured generation times ranged from 8s (trivial prompt) to 172s (long prompt), with the same prompt varying by 60%+ run-to-run. This is now handled gracefully (no more false failures), but the underlying slowness and its user-facing experience (a multi-minute wait with only a loading state) is unaddressed. Async/background generation was deferred per ADR-0005 and remains the long-term answer.
- **Prompt Library MVP is intentionally minimal** — no Favorites, Search, Tags, Categories, Export, or Version History, all explicitly deferred in Sprint 3's scope.

---

## Technical Debt

| Item | Severity | Notes |
|---|---|---|
| `ContentProject`/`GeneratedContent` ownership gap | High | Largest architectural gap; ADR-0006's pattern is proven and ready to extend |
| Repo-wide frontend lint (26 errors, 3 warnings) | Medium | Pre-existing, unrelated to Content Studio, now accurately measured (was previously undercounted in sprint logs) |
| 2 pre-existing `search-provider.test.tsx` failures | Low | Confirmed pre-existing via baseline diff, unrelated to this project's work |
| No CI/CD | Medium | Manual deploy process; this sprint's incident (regressions only visible in production) is a direct symptom of not having a staging/CI gate |
| `CONTRIBUTING.md` / `DEVELOPMENT.md` incomplete | Low | Both cut off mid-instruction, flagged since ACF planning |
| Content Studio dashboard has non-functional placeholder UI (`QuickActions`, `ContentPipeline`) | Medium (product-facing) | Presented as real data (e.g. "8 Ideas / 5 Writing / 2 Review / 11 Published") but wired to nothing — a product decision, not an engineering one |
| Minor formatting/consistency debt (double-quote violations, inconsistent query-key construction, one inline mutation) | Low | Catalogued in the Content Studio UI investigation, none blocking |
| Unexplained `tsx watch` process (PID 207157) | Low | Not interfered with; worth confirming it's not a stale/orphaned process |

---

## Recommendations Before Sprint 4

1. **Decide on `ContentProject`/`GeneratedContent` ownership before building more features on top of them.** AI Image Generation, if it follows the same project-based model, would inherit this same gap on day one rather than fixing it — better to close it now while the ADR-0006 pattern is fresh and proven, than retrofit it later across more surface area.
2. **If AI Image Generation is confirmed as Sprint 4's scope, budget explicit time for the same three-layer timeout question this incident just surfaced** — image generation is likely to be at least as slow as text generation, if not slower, and will need its own timeout reconciliation across frontend/backend/reverse-proxy from the start rather than discovering it in production again.
3. **Consider a lightweight pre-deploy check** (even a manual checklist item, short of full CI/CD) that specifically exercises a real generation request through the production path (not just a health check) before declaring a deploy successful — this incident's regressions were both invisible to the existing health check and only surfaced on real user traffic.
4. **Decide what to do with the non-functional dashboard placeholders** (`QuickActions`, `ContentPipeline`) before they're visible to anyone outside this session — either wire them to real data or clearly label them, since they currently look indistinguishable from real functionality.
5. **No blocking issues found** — Content Studio, including this incident's resolution, is production-ready. The above are prioritization inputs for Sprint 4 scoping, not blockers to starting it.
