import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CheckResult } from '../types/index.js'

const PACKAGE_DIR = path.dirname(fileURLToPath(import.meta.url))

// This package lives at <repo root>/tools/ai-cli/core — repo root is two levels up.
export const REPO_ROOT = path.resolve(PACKAGE_DIR, '..', '..', '..')

export function checkRepoPath(label: string, relativePath: string): CheckResult {
  const ok = existsSync(path.join(REPO_ROOT, relativePath))
  return { label, ok, detail: ok ? undefined : `expected at ${relativePath}` }
}

export function checkAgentsFile(): CheckResult {
  return checkRepoPath('AGENTS.md found', 'AGENTS.md')
}

export function checkContextLoaded(): CheckResult {
  const ok =
    existsSync(path.join(REPO_ROOT, '.context')) &&
    existsSync(path.join(REPO_ROOT, '.context/AI_BOOTSTRAP.md'))
  return {
    label: '.context loaded',
    ok,
    detail: ok ? undefined : 'missing .context/ or .context/AI_BOOTSTRAP.md',
  }
}

export function checkPromptArchitecture(): CheckResult {
  return checkRepoPath('Prompt Architecture v2 detected', 'docs/prompts/01_START_SESSION.md')
}

export function checkRepositoryStandards(): CheckResult {
  return checkRepoPath('Repository standards available', '.context/coding-rules.md')
}

export function runRepositoryChecks(): CheckResult[] {
  return [
    checkAgentsFile(),
    checkContextLoaded(),
    checkPromptArchitecture(),
    checkRepositoryStandards(),
  ]
}
