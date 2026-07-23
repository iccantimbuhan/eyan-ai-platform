# Portfolio

A running log of portfolio-worthy milestones from this project — for the portfolio website, GitHub README highlights, resume bullets, and LinkedIn updates.

This file is **appended to, not overwritten**, and updated **only when a completed sprint provides genuine portfolio value** — not every sprint qualifies, and that's by design. See `.claude/prompts/09_PORTFOLIO_MODE.md` for the process used to evaluate and draft an entry.

Entry format:

```markdown
## <Sprint/Milestone Name> — YYYY-MM-DD

**What was built**

**Why it's a strong signal** (architecture, problem-solving, engineering judgment, etc.)

**Suggested talking point / screenshot**
```

---

## AI Collaboration Framework (ACF), Stage 1 — 2026-07-23

**What was built**

A repository-first engineering workflow so any AI tool (Claude Code, ChatGPT, Codex, Gemini) or human developer can pick up work with zero chat history: a single current-state file (`PROJECT_STATE.md`), immutable sprint logs (`tasks/`), Architecture Decision Records (`.claude/decisions/ADR-NNNN`), a standard changelog, and Definition-of-Done integration across all six of the repo's existing DoD-bearing documents — designed to extend the project's existing engineering framework rather than replace it.

**Why it's a strong signal**

This isn't a feature — it's process engineering, and it demonstrates judgment a feature alone doesn't: catching a real design flaw in a dry run before calling it done (a "completed sprints" pointer that would have silently degraded into an unbounded history log by sprint 20), resolving an ADR-numbering collision before it shipped, and canceling two originally-planned files (`ROADMAP.md`, `ARCHITECTURE.md`) after discovering existing docs already served that purpose — restraint and repo awareness over adding more files. It also validates itself: this sprint is its own first real test case, closing with a sprint log, no changelog entry (correctly, since nothing user-facing shipped), and this very portfolio entry.

**Suggested talking point / screenshot**

Talking point: "I designed and shipped a documentation framework that lets multiple AI coding tools and human developers collaborate on the same codebase without shared memory — then used a dry-run test to catch and fix a scalability bug in the framework's own design before considering it done." Screenshot: `PROJECT_STATE.md` alongside the `tasks/` and `.claude/decisions/` folder structure in a file tree view.

---

## Content Studio: Prompt Templates & Generation UX — 2026-07-23

**What was built**

A full-stack Prompt Templates feature for the Content Studio: a seeded template catalog grouped by category, a Template Picker with category/recent tabs, a live preview panel, and dynamic `{{variable}}` form fields that fill in a template and generate AI content in one flow — while the original free-text "Custom Prompt" path keeps working exactly as it did before the feature existed. Last-selected and recently-used templates are remembered locally between visits.

**Why it's a strong signal**

The core engineering decision — resolving `{{variable}}` substitution entirely client-side — meant the existing AI generation endpoint and its whole service chain (`ContentService`, `ChatService`, `ProviderFactory`, `OllamaProvider`) needed **zero** changes to support templates (see ADR-0004), despite this being a substantial user-facing feature. Scope was also actively cut down from a much larger originally-proposed plan (Prompt Library, versioning, rename/restore, soft delete, export) to keep this sprint small and independently shippable — each deferred piece has a clear, intentional home in a future sprint rather than being abandoned. The feature shipped in four independently reviewed phases (schema/API, picker/preview, integration, polish), each with its own build/typecheck/lint/test validation, and closed with dedicated test coverage for every piece of real logic (variable parsing/substitution, recency tracking, template restore-on-load) while deliberately leaving simple fetch-and-delegate containers untested, matching the codebase's existing testing conventions rather than testing everything indiscriminately.

**Suggested talking point / screenshot**

Talking point: "I added AI prompt templates to a content generation tool by doing all the variable substitution client-side, which meant the feature needed zero backend or AI-provider changes — then used that same discipline to keep the sprint scoped down to what could ship independently, deferring the bigger feature set to later work instead of over-building." Screenshot: the Template Picker with its category tabs and a filled-in variable form, next to the generated output.

---

## Prompt Library: Per-User Data Ownership — 2026-07-23

**What was built**

A personal Prompt Library — save, edit, delete, and reuse prompts — built on the first genuinely enforced per-user data ownership model in the codebase. Before writing any schema, three ownership designs were evaluated and recorded in an ADR (`ADR-0006`), with the tradeoffs made explicit: a required `userId` foreign key, checked at the repository layer on every read, with unauthorized access returning `404 Not Found` rather than `403 Forbidden` — a deliberate choice to avoid leaking the existence of another user's data through the error response itself.

**Why it's a strong signal**

Most of this codebase's models — including the pre-existing `ContentProject` and `GeneratedContent` — have no ownership enforcement at all; any authenticated user can read or delete any other user's project by guessing an ID. This sprint didn't just add a feature, it designed and shipped the pattern this gap will eventually need to be closed with, then proved the pattern actually works: two real throwaway users were registered against the real dev database, and every cross-user read/update/delete attempt was confirmed to fail exactly as designed — not asserted from a unit test, verified over real HTTP. The sprint's closeout also caught and corrected two inaccurate validation claims that had been silently repeated across two prior sprint logs (an undercounted lint error count, and a mischaracterized test-failure list) by re-running full-repo checks and diffing against a clean baseline instead of trusting the earlier numbers — the kind of self-auditing that keeps a project's own documentation trustworthy over time.

**Suggested talking point / screenshot**

Talking point: "I designed a per-user ownership model as its own ADR before writing any code, then proved it worked with real cross-user attack attempts against a live database — not mocks — confirming the API returns 404s instead of 403s specifically so it never leaks whether another user's data exists." Screenshot: the Prompt Library page next to the ADR's alternatives-considered table.
