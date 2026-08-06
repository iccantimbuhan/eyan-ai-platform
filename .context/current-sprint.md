# Current Sprint

_Rewrite this file completely whenever `PROJECT_STATE.md`'s top entry changes. Current state only — never accumulate history here. Full history: `PROJECT_STATE.md`, then `tasks/completed/`._

**Restaurant Operations Platform — Sprint 0 (Tenancy Foundation) — COMPLETE, deployed, and verified in production.** Multi-tenancy foundation for the platform's first commercial module: `Organization → Restaurant → Branch`, `OrganizationMember`/`RestaurantMember`, `requireRestaurantAccess`/`requireBranchAccess`, a Module Registry (`OrganizationModule`), `GET /organizations/me`, a real `TeamSwitcher`, and a placeholder "Restaurant Operations" nav entry. No business feature exists yet — see `restaurant.md`, ADR-0025, ADR-0026. A post-deploy gap (bootstrap seed data never reached production, so the sidebar item stayed hidden) was root-caused and fixed by splitting seeding into an automated `bootstrap.ts` (platform-required) vs. a manual `seed.ts` (demo/sample) — see ADR-0035. Full regression (909 backend / 421 frontend tests) confirmed no existing module regressed.

**Also complete — Sprint 5.2 (Production Stabilization, unrelated track).** Fixed CRM AI qualification write-back to accept `"UNKNOWN"` as a legitimate value (see `crm.md`), fixed a missing `trust proxy` config, fixed a Slack/Email notification bug in the automation hub's Workflow 4.

**Next up:**
- **Restaurant Operations Sprint 1** — Restaurant/Branch admin CRUD, Menu/Categories/Ingredients/Suppliers/Recipes (master data only — see `restaurant.md`).
- **AI Core Phase 2** — migrate the remaining call sites (Chat, Video, Content) to invoke AI Core Capabilities instead of calling providers directly, one call site at a time, no breaking changes. CRM is already migrated (Phase 3 — see `ai-core.md` and `crm.md`).
