# ADR-0004 — Client-Side Prompt Variable Substitution

## Context

Sprint 2 added Prompt Templates with `{{variable}}` placeholders (e.g. `{{business}}`, `{{audience}}`, `{{tone}}`). Filling those variables in and producing a final prompt for the AI could happen either server-side (client sends a template id plus variable values; backend substitutes) or client-side (client substitutes locally and sends the resulting plain prompt string).

## Decision

Variable substitution happens entirely client-side, before calling `POST /content/generate`. The endpoint's contract is completely unchanged — it still accepts exactly `{ projectId, type, prompt }`, the same shape it had before Prompt Templates existed.

## Alternatives Considered

**Server-side substitution** (backend accepts a `templateId` and a variable map, and builds the prompt itself). Rejected for this sprint — it would require the generation endpoint to become aware of templates, which conflicts with the explicit constraint that Sprint 2 must not modify the existing AI generation flow, and it provides no benefit the client-side approach doesn't already deliver.

## Consequences

`ContentService`, `ChatService`, `ProviderFactory`, and `OllamaProvider` needed zero changes to support templates — this is the direct payoff of the decision. If a future need arises for server-enforced prompt construction (e.g. a template a client shouldn't be able to tamper with before it reaches the model), that would require revisiting this decision.
