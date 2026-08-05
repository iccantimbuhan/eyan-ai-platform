import { describe, expect, it } from 'vitest'
import { loadPromptSource } from '../../core/prompt/loader.js'

describe('loadPromptSource', () => {
  it('loads a real repository file', () => {
    const content = loadPromptSource('docs/prompts/01_START_SESSION.md')
    expect(content).toContain('Start Session')
  })

  it('throws on a missing file', () => {
    expect(() => loadPromptSource('docs/prompts/does-not-exist.md')).toThrow(/not found/)
  })

  it('refuses to load a path outside the repository', () => {
    expect(() => loadPromptSource('../../../etc/passwd')).toThrow(/outside the repository/)
  })
})
