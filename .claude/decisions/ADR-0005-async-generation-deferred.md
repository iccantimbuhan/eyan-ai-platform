# ADR-0005 — Async/Background Generation Deferred

## Context

Originating from Sprint 1.1 (AI Infrastructure Optimization). The benchmark in that sprint measured content generation taking 30 seconds to several minutes depending on output length, on hardware that will not get meaningfully faster without a platform change. Sprint 1.1 assessed — as documentation only, not implementation — whether the current synchronous request/response generation flow could reasonably support background/async generation in the future.

## Decision

Async/background generation was assessed as architecturally low-risk to add later: `ChatService.chat()` is already decoupled from Express `req`/`res`, and `ContentService.generate()` already separates "call the model" from "persist the result" — exactly the seam a queue worker would use. Despite this, async generation was **not implemented** in Sprint 1.1 or Sprint 2. Generation remains fully synchronous today.

## Alternatives Considered

**Implementing a job queue immediately in Sprint 1.1.** Rejected — out of scope for an infrastructure-optimization sprint, and premature before Content Studio's actual usage patterns (typical content length, request volume) were established by real use of the templates/generation features built in Sprint 2.

## Consequences

Content Studio's generation UX is currently bounded by synchronous HTTP timeouts, and by extension by the ~3 tok/s throughput measured in Sprint 1.1. Sprint 2's plan explicitly flags async generation as a likely prerequisite before Content Studio adds larger content types (full articles, longer docs). This ADR exists so that decision doesn't need to be re-derived from scratch when that prerequisite is revisited — the low-risk implementation seam is already identified.
