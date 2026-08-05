# @eyan/ai-cli

Internal TypeScript engine behind the `tools/ai` launcher.

`tools/ai` is the stable public entrypoint — this package is not meant to be invoked directly. It exists so AI-workflow commands can be written in typed, tested TypeScript instead of bash, without changing how anyone already calls `tools/ai`.

## Commands (Sprint 1)

- `start` — verify the repository has the AI collaboration context in place (`AGENTS.md`, `.context/`, Prompt Architecture v2, `.context/coding-rules.md`). Checks existence only — never reads or summarizes the files.
- `help` — list available commands.

Run via `tools/ai start` / `tools/ai help`, or the pnpm wrappers `pnpm ai:start` / `pnpm ai:help`.

Future commands (`bug`, `review`, `audit`, `doctor`, `stats`) are reserved for later sprints — see `docs/prompts/02_BUILD_FEATURE.md`.

## `feature` command (Sprint 5)

`commands/feature.ts` — the first production command built on the Prompt Builder. Run via `tools/ai feature` / `pnpm ai feature`.

Prompts interactively for: feature name, business goal, technical goal, repository contexts (numbered multi-select, sourced live from `listContextDomains()`), and whether to enable Portfolio Mode. It then constructs a `PromptRequest`, calls `buildPrompt()`, and prints the returned string — nothing else. It's a thin layer: input collection lives in `core/input.ts` (generic readline primitives, no knowledge of what's being asked), and all assembly logic stays inside the Prompt Builder, Prompt Engine, and Context Engine, none of which this command touches directly beyond `buildPrompt` and the read-only `listContextDomains`.

## Prompt Engine (Sprint 2)

`core/prompt/` is the reusable engine future commands will render prompts through — not yet wired into any command.

- `registry.ts` — maps logical prompt IDs to repository files under `docs/prompts/`, and resolves an ID to a `PromptTemplate` (`id`, `title`, `category`, `path`). Callers work with IDs only; they never see a path.
- `loader.ts` — reads a file by path relative to the repository root, with a path-traversal guard. Not aware of `docs/prompts/` specifically, so new prompt directories need no engine change.
- `variables.ts` — substitutes `{{key}}` placeholders (`string | number | boolean` values); unknown placeholders are left untouched rather than erroring.
- `renderer.ts` — consumes `PromptTemplate` objects (a template plus optional modifiers, e.g. `portfolio-mode`), combines them, substitutes variables, and can print the result.

A future command only needs a prompt ID and a variables object — everything else (path resolution, loading, combining, substituting) is handled automatically.

## Context Engine (Sprint 3)

`core/context/` determines which repository context should accompany a future generated prompt. It's the single place that knows repository paths for context files — the Prompt Engine doesn't, and isn't touched by this module.

**Public API — `core/context/index.ts` only.** Future commands must import from there, never from `registry.ts` directly:

- `resolveContext(id)` — resolves a logical context id (e.g. `'crm'`) to itself plus any dependencies (e.g. `'coding-rules'`), as `ContextMetadata[]`.
- `listContextDomains()` — all 12 registered contexts, for future discovery commands.
- `loadContextSource(path)` — reads a context file's content. Reuses the Prompt Engine's `loadPromptSource` directly rather than duplicating its path-traversal guard.

`registry.ts` is a private implementation detail (a static array today) — deliberately not re-exported, so it can change shape later without affecting any command built against the three functions above. The 12 registered contexts mirror `.context/AI_BOOTSTRAP.md`'s routing table exactly: `backend`, `frontend`, `ai-core`, `crm`, `finance`, `content-studio`, `automation` (each paired with `coding-rules`, matching that table's pairing), plus `deployment`, `repository-map`, `current-sprint`, `architecture`, and `coding-rules` standing alone.

## Prompt Builder (Sprint 4)

`core/builder/` is the orchestration layer that assembles the Prompt Engine and Context Engine into one final prompt string. It owns no loading logic itself — it only calls the two engines' existing public functions — and it knows neither how prompts are loaded nor how context files are loaded.

**Public API — `core/builder/index.ts`:**

- `buildPrompt(request: PromptRequest)` — resolves `request.templateId` via the Prompt Engine, resolves and dedupes `request.contextIds` via the Context Engine, loads any `request.modifierIds` as prompt modifiers, substitutes `request.variables` throughout, and returns the assembled prompt as a plain string. Context (if any) is placed before the task prompt, mirroring Start Session's own "load context, then act" ordering. Never prints, never wired into any command yet — that's future scope.
