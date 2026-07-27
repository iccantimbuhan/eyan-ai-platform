# Sprint 6.6 — Production Dashboard

Status: Completed

## Goal

Sixth and final phase of Sprint 6 ("Enterprise Creative Production Suite"): build the dashboard UI on top of Sprint 6.5's Analytics Foundation, aggregating existing platform data (projects, assets, brand kits, content, images, video, review, publishing, analytics) with no new backend storage beyond what's genuinely necessary.

## Scope

### In Scope

- A dedicated Production Dashboard page inside the Content Studio area, with its own route and sidebar entry — confirmed with the user as a page separate from the platform's existing home dashboard (a different domain: platform administration vs. Content Studio creative operations).
- The identical dashboard composition reused as a new "Analytics" tab on each project's own workspace.
- One small, additive backend extension: a platform-wide activity feed (`GET /api/v1/analytics/activity`), since Sprint 6.5 only built the project-scoped version.
- Charts (assets by type, provider usage) built with `recharts`, and status breakdowns/performance stats/activity feed as non-chart presentational components, following the `dataviz` skill's procedure.

### Out of Scope (explicit, deferred)

- Any change to the platform's existing home dashboard (`/`, system health/models/providers) — confirmed with the user to stay completely untouched.
- Embedding `ReviewQueue`/`PublishingQueue` directly in either dashboard view — both are self-contained page sections, not designed as tiles; the dashboards show their status-count summaries instead.
- Any new database table — everything visualized this sprint is either already-existing data or Sprint 6.5's `AnalyticsEvent`/`AssetReviewEvent`/`PublishingRecord`.

## What Shipped

**One small backend extension** — `AnalyticsEventRepository.findManyByProjectIds()` and `AssetReviewEventRepository.findManyByProjectIds()` (both mirror the existing `findManyBySourceIds`-style batch-by-IN-query shape), plus `AnalyticsService.getPlatformActivity(userId, query)`, which fetches the user's own project ids and reuses the identical merge/sort/paginate logic `getProjectActivity()` already established via a new shared `buildActivityFeed()` helper (both methods now call it, eliminating what would otherwise have been duplicated logic). New endpoint: `GET /api/v1/analytics/activity`, `authenticate`-only, same as the rest of the analytics surface.

**Frontend — new files**: `types/analytics.ts`, `api/analytics.api.ts`, `hooks/use-analytics.ts` (all read-only — no mutations), `lib/utils.ts` gained `formatDurationMs()`. New `components/analytics/` subfolder: `AssetCountsChart`/`ProviderUsageChart` (single-series `recharts` `BarChart`s, one consistent color from this app's existing `--chart-1`/`--chart-2` theme tokens — a magnitude comparison, not an identity comparison, so no categorical hue assignment needed), `StatusCountsList` (a labeled count list reusing the same shadcn `Badge` variants `AssetStatusBadge` already established, not a chart — a handful of named statuses is clearer as a list than a bar chart needing a legend), `PerformanceStats` (a `StatCard` pair — a single headline number, not a chart), `ActivityFeed` (a plain paginated list), `AnalyticsSummary` (composes the above from one `ProjectAnalyticsSummary` DTO — shape-agnostic of project- vs. platform-scoping, so it's reused unchanged in both places below), `ProjectAnalytics` (wires the project-scoped hooks into `AnalyticsSummary` + `ActivityFeed`).

**New Production Dashboard page** — `pages/production-dashboard/ProductionDashboard.tsx`, route `/content-studio/dashboard`, new sidebar entry ("Production Dashboard") in the existing "Content Studio" nav group alongside "Content Studio" and "Prompt Library." Composes: a top row of `StatCard` tiles (Projects — reusing the existing project-list count, no new endpoint; Total Assets; AI Content; AI Images; AI Video; Brand Kits, all derived from the platform summary's `assetCounts`), `AnalyticsSummary`, and `ActivityFeed` via the new platform-wide activity endpoint.

**`ProjectWorkspace.tsx`** gained one more tab, `analytics`, rendering `<ProjectAnalytics projectId={projectId} />` — the same mechanical, well-precedented change used to add every prior tab (`publishing` in 6.4, etc.).

## Files Created / Modified

**Backend — modified:** `repositories/analytics-event.repository.ts`/`asset-review-event.repository.ts` (+`findManyByProjectIds`, +tests), `services/analytics.service.ts` (+`getPlatformActivity`, +shared `buildActivityFeed` helper, +tests), `controllers/analytics.controller.ts` (+`getPlatformActivity`), `routes/v1/analytics.routes.ts` (+`GET /activity`), `validators/analytics.validator.ts` (+`platformActivityQueryValidator`).

**Frontend — new:** `types/analytics.ts`, `api/analytics.api.ts`, `hooks/use-analytics.ts`, `components/analytics/` (`AssetCountsChart`, `ProviderUsageChart`, `StatusCountsList`, `PerformanceStats`, `ActivityFeed`, `AnalyticsSummary`, `ProjectAnalytics`, each with a `.test.tsx`), `pages/production-dashboard/` (`ProductionDashboard.tsx` + `.test.tsx` + `index.ts`), `routes/_authenticated/content-studio/dashboard.tsx`.

**Frontend — modified:** `lib/utils.ts` (+`formatDurationMs`), `components/layout/data/sidebar-data.ts` (+"Production Dashboard" nav item), `pages/project-workspace/ProjectWorkspace.tsx` (+Analytics tab), `vite.config.ts` (+`optimizeDeps.include: ['recharts']`), `context/search-provider.test.tsx` (one assertion made exact-match — see Decisions Made).

**Docs:** `docs/ASSET_LIBRARY.md`, `CHANGELOG.md`, `PROJECT_STATE.md` updated; this sprint log added. No new ADR — nothing here introduces a new architectural pattern (the platform-activity endpoint directly extends the existing project-activity one; the frontend follows established conventions throughout, including the confirmed decision to keep the two dashboards separate).

## Database Changes

None. No migration this sprint — every new backend method queries existing tables (`AnalyticsEvent`, `AssetReviewEvent`) via new, additive repository methods only.

## API Changes

New: `GET /api/v1/analytics/activity` (platform-wide activity feed, paginated, `authenticate`-only). No existing endpoint's shape changed.

## Validation

- Build: clean (backend `tsc`; frontend `tsc -b && vite build`).
- Typecheck: clean on both sides.
- Lint: backend has no lint step; frontend `eslint .` clean on every file this phase touched or added — repo-wide lint unchanged from baseline (confirmed no `analytics`/`production-dashboard`/`sidebar-data`/`search-provider`/`vite.config` file in the lint output).
- Tests: backend 448/448 passing (up from 442 — new: repository `findManyByProjectIds` cases, `AnalyticsService.getPlatformActivity` cases). Frontend: full suite runs to completion — 325/329 passing, 4 failing, all 4 the same pre-existing `search-provider.test.tsx`/`user-auth-form.test.tsx` baseline failures (one of the two `search-provider.test.tsx` failures was briefly a regression this sprint introduced and then fixed — see Decisions Made); 28 new tests across the 7 new `components/analytics/` test files plus `ProductionDashboard.test.tsx`, all passing.
- Live validation (2026-07-27, against the real EYAN Studio development database and backend on throwaway projects/users, cascade-deleted afterward): confirmed via direct API calls that `GET /analytics/activity` correctly merges and paginates generation/review events across two separate projects (not conflated with either project's own scoped feed) and that `GET /analytics/summary` correctly sums `totalAssets` across both while each project's own `GET /analytics/projects/:id/summary` remains correctly scoped to just its own asset. **Also performed a real browser check** (Playwright driving the actual dev-mode frontend against the throwaway backend, not just mocked component tests): registered a user, generated and approved-and-published a real image asset, logged into the running app through the actual sign-in form, and visually confirmed both the Production Dashboard and the project's new Analytics tab render the real chart/tile/activity-feed data correctly (screenshots inspected directly) — headline tiles, the assets-by-type and provider-usage bar charts, review/publishing status lists, performance stat tiles, and a correctly-ordered, correctly-worded recent-activity feed all matched the seeded data exactly. All test data cleaned up afterward — verified zero leftover rows.

## Decisions Made

- **The Production Dashboard is a dedicated Content Studio page, not an addition to the platform's home dashboard** — confirmed with the user: platform administration (system health/models/providers) and Content Studio creative operations are different domains for different users, and should stay visually and architecturally separate even though both are technically "a dashboard."
- **One small backend extension this sprint**: `getPlatformActivity`, since Sprint 6.5 only built the project-scoped activity feed but the Production Dashboard's brief explicitly wants platform-level "Recent activity" — built from existing data via two new, additive `findManyByProjectIds` repository methods, no new storage.
- **`recharts` required a config fix, not a code workaround**: the very first time this dependency was ever imported in this codebase, Vite's dependency optimizer discovered it mid-test-run and reloaded, duplicating the React instance a test had already rendered with ("Invalid hook call"). Fixed at the source — added `recharts` to `vite.config.ts`'s `optimizeDeps.include` — rather than working around the symptom in individual test files.
- **A pre-existing test's ambiguous locator was tightened, not worked around** — adding the "Production Dashboard" sidebar item briefly broke `search-provider.test.tsx`'s `getByText('Dashboard')` assertion (which non-exact-matches "Production Dashboard" as a substring, now ambiguous with two matches). Fixed the test's own assertion to `{ exact: true }`, which is what it always should have unambiguously meant (verifying the Platform group's own "Dashboard" item specifically) — not by avoiding the word "Dashboard" in the new, legitimately-branded feature.
- **Charts are single-color, not categorical** — `AssetCountsChart`/`ProviderUsageChart` each plot one series (a count) across categories, which the `dataviz` skill treats as a magnitude comparison, not an identity comparison — so every bar uses one consistent color rather than inventing a multi-hue categorical palette (which would also require running the skill's validator script for something that was never actually needed).
- **Review/publishing status counts are a list, not a chart** — a handful of named statuses (3-6 typically) is clearer as a labeled count list (reusing `AssetStatusBadge`'s existing `Badge` variants) than as a bar chart requiring a legend to decode, per the skill's own "sometimes the answer isn't a chart" guidance.

## Follow-ups for Future Sprints

- This completes Sprint 6 ("Enterprise Creative Production Suite") — see the separate Sprint 6 closeout for platform-wide recommendations.
