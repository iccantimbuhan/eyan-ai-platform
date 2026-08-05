import { describe, expect, it } from 'vitest'
import {
  checkAgentsFile,
  checkContextLoaded,
  checkPromptArchitecture,
  checkRepoPath,
  checkRepositoryStandards,
  runRepositoryChecks,
} from '../core/repository.js'

describe('repository checks', () => {
  it('finds AGENTS.md', () => {
    expect(checkAgentsFile().ok).toBe(true)
  })

  it('finds .context and AI_BOOTSTRAP.md', () => {
    expect(checkContextLoaded().ok).toBe(true)
  })

  it('finds the Prompt Architecture v2 session contract', () => {
    expect(checkPromptArchitecture().ok).toBe(true)
  })

  it('finds coding-rules.md', () => {
    expect(checkRepositoryStandards().ok).toBe(true)
  })

  it('runs all checks, and they all pass in this repository', () => {
    const results = runRepositoryChecks()
    expect(results).toHaveLength(4)
    expect(results.every((result) => result.ok)).toBe(true)
  })

  it('reports a missing path with a helpful detail', () => {
    const result = checkRepoPath('Nonexistent', 'this-file-does-not-exist.md')
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('this-file-does-not-exist.md')
  })
})
