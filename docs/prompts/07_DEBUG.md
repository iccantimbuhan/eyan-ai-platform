# Debug

Assumes the Start Session contract (`01_START_SESSION.md`) is already active. This follows the same investigation discipline as `03_FIX_BUG.md` — gather evidence, find the root cause, never guess — with a wider net for live or production issues, plus a closing Lessons Learned step. Planning, approval, implementation, and reporting otherwise follow the session contract.

Never guess. Investigate first.

---

## Step 1 — Gather Information

Collect:

- Error message
- Stack trace
- Logs
- Environment
- Steps to reproduce
- Related modules and dependencies

---

## Step 2 — Root Cause

Explain:

- Root cause
- Why existing safeguards failed
- Why the issue reached production

Feed this into the Start Session Step 3 fix plan.

---

## Validation Additions

In addition to Start Session Step 6, confirm the original issue is resolved and run regression checks.

---

## Step 3 — Lessons Learned

Explain:

- Prevention
- Monitoring improvements
- Test improvements
- Documentation updates

---

## Final Report Additions

Extend the Start Session report with:

- **Root Cause**
- **Prevention**
