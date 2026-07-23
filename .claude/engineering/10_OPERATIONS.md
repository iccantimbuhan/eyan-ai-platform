# Operations Playbook

Version: 1.0

---

# Purpose

This playbook covers operational tasks that affect the repository beyond feature development.

---

# Database Changes

Before changing the database

✓ Review existing schema

✓ Consider migrations

✓ Review relationships

✓ Verify indexes

✓ Update documentation

---

# API Changes

Verify

✓ REST conventions

✓ Authentication

✓ Authorization

✓ Version compatibility

✓ API documentation

---

# Security Checklist

Verify

✓ No secrets committed

✓ Environment variables used

✓ Input validation

✓ Authorization

✓ Authentication

✓ Sensitive data protected

---

# Performance Checklist

Review

✓ Database queries

✓ API performance

✓ React rendering

✓ Caching

✓ Bundle size

---

# Pull Requests

Every PR should include

- Summary
- Motivation
- Files changed
- Screenshots (if UI)
- Testing performed
- Risks
- Follow-up work

---

# Release Checklist

Before release

✓ Build

✓ Typecheck

✓ Lint

✓ Tests

✓ Database migrations reviewed

✓ Environment variables documented

✓ Documentation updated

✓ Version updated

✓ Changelog updated

---

# Deployment

Before deployment

✓ Any reverse proxy in front of the API (e.g. nginx `proxy_read_timeout`) allows at least as long as the backend's own AI provider timeout, plus a safety margin. A shorter proxy timeout returns a false failure to the browser even when the backend request succeeds — this caused a real production incident (see `tasks/completed/sprint-3-prompt-library.md`).

After deployment

Verify

✓ Application starts

✓ Health checks pass

✓ Authentication works

✓ Critical workflows succeed

✓ Monitoring shows no new errors

---

# Incident Response

If a production issue occurs

1. Identify impact
2. Gather logs
3. Find root cause
4. Apply the safest fix
5. Verify recovery
6. Document lessons learned


---

# AI Operations

This checklist applies to all AI-powered services and deployments.

## Model Management

Verify

✓ AI models are compatible with the target hardware.

✓ Unsupported or oversized models are removed from production.

✓ Default model configuration is documented.

✓ Model changes are version controlled where appropriate.

---

## Ollama Operations

Verify

✓ Ollama service is running.

✓ Required models are installed.

✓ Configured models are available.

✓ AI inference completes successfully.

✓ Model startup time is acceptable.

✓ Timeouts are monitored.

✓ The deployment process warms the configured model (a minimal request that loads it into memory, e.g. `/api/generate` with an empty prompt) immediately after the deploy's health check passes — see `deploy.sh`. Ollama unloads idle models, so without this, the first real user request after any restart or deploy pays the full cold-load cost.

✓ Every timeout in the request chain in front of Ollama (frontend HTTP client, backend AI provider client, and any reverse proxy) is at least as long as the slowest realistic generation on the current hardware — a shorter timeout anywhere in the chain produces a false failure even when the backend and Ollama both succeed.

---

## AI Deployment

After deployment verify

✓ ChatService starts successfully.

✓ AI endpoints respond successfully.

✓ Model configuration matches the deployment environment.

✓ AI requests complete without unexpected failures.

✓ Logs contain no AI-related startup errors.

---

## AI Performance

Monitor

✓ Inference response time.

✓ CPU utilization.

✓ Memory utilization.

✓ Swap usage.

✓ Concurrent request behavior.

✓ Model loading time.

Investigate significant performance regressions before adding larger models.

---

## AI Incident Response

If an AI service issue occurs

1. Verify the AI provider is available.
2. Verify the configured model exists.
3. Review AI service logs.
4. Verify model response time.
5. Check CPU, memory, and swap utilization.
6. Confirm application recovery after the issue is resolved.

