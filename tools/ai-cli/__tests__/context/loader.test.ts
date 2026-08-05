import { describe, expect, it } from 'vitest'
import { loadContextSource } from '../../core/context/loader.js'

describe('loadContextSource', () => {
  it('loads a real .context file', () => {
    const content = loadContextSource('.context/coding-rules.md')
    expect(content).toContain('Coding Rules')
  })

  it('throws on a missing file', () => {
    expect(() => loadContextSource('.context/does-not-exist.md')).toThrow(/not found/)
  })
})
