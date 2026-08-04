# Repository Audit

Assumes the Start Session contract (`01_START_SESSION.md`) is already active for repository standards. This is a read-only audit — do not implement fixes unless requested. Start Session's plan/approval/implementation steps do not apply.

Provide an engineering assessment first. Your objective is to improve the long-term health of the repository.

---

## Audit Scope

Architecture, Code Quality, Security, Performance, Scalability, Maintainability, Documentation, Developer Experience, Testing, Dependency Management.

---

## Architecture Review

Folder structure, module boundaries, separation of concerns, coupling, reusability, design consistency.

---

## Backend Review

Controllers, services, repositories, DTOs, validation, authentication, authorization, error handling.

---

## Frontend Review

Components, hooks, routing, state management, API integration, accessibility, responsiveness.

---

## Security Review

Hardcoded secrets, missing validation, authorization weaknesses, authentication gaps, dependency vulnerabilities, sensitive data exposure.

---

## Performance Review

Database queries, API performance, bundle size, duplicate logic, unused code, rendering performance.

---

## Documentation Review

Verify `AGENTS.md`, `.context/`, and `README.md` are current and consistent with each other. Identify missing or outdated documentation.

---

## Technical Debt

Dead code, duplicate code, large files, complex methods, outdated patterns, refactoring opportunities. Prioritize by impact.

---

## Repository Health Score

Rate 1–10: Architecture, Code Quality, Security, Performance, Testing, Documentation, Maintainability, Developer Experience, Portfolio Readiness.

---

## Recommendations

Classify each finding:

🔴 Critical
🟠 High
🟡 Medium
🟢 Low

Recommend the highest-value improvements first.

---

## Final Report

Return:

## Executive Summary

## Health Score

## Strengths

## Weaknesses

## Risks

## Top 10 Recommendations

## Suggested Roadmap

Do not modify code until requested.
