import { describe, expect, it } from 'vitest'
import * as ContextEngine from '../../core/context/index.js'

describe('Context Engine public API', () => {
  it('exposes exactly resolveContext, listContextDomains, and loadContextSource', () => {
    expect(Object.keys(ContextEngine).sort()).toEqual(
      ['listContextDomains', 'loadContextSource', 'resolveContext'].sort()
    )
  })

  it('resolveContext works through the public barrel', () => {
    expect(ContextEngine.resolveContext('crm').map((entry) => entry.id)).toEqual([
      'crm',
      'coding-rules',
    ])
  })

  it('loadContextSource works through the public barrel', () => {
    expect(ContextEngine.loadContextSource('.context/coding-rules.md')).toContain('Coding Rules')
  })
})
