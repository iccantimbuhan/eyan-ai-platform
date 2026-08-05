import { describe, expect, it } from 'vitest'
import { listContextDomains, resolveContext } from '../../core/context/resolver.js'

describe('resolveContext', () => {
  it('resolves a domain to itself plus coding-rules', () => {
    const result = resolveContext('crm')
    expect(result.map((entry) => entry.id)).toEqual(['crm', 'coding-rules'])
  })

  it('resolves coding-rules to just itself', () => {
    const result = resolveContext('coding-rules')
    expect(result.map((entry) => entry.id)).toEqual(['coding-rules'])
  })

  it('resolves a standalone entry (no includes) to just itself', () => {
    const result = resolveContext('deployment')
    expect(result.map((entry) => entry.id)).toEqual(['deployment'])
  })

  it('throws on an unknown id', () => {
    expect(() => resolveContext('does-not-exist')).toThrow(/Unknown context id/)
  })

  it('never returns duplicate ids for any registered domain', () => {
    for (const domain of listContextDomains()) {
      const ids = resolveContext(domain.id).map((entry) => entry.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('listContextDomains', () => {
  it('lists all 12 domains with the expected category counts', () => {
    const domains = listContextDomains()
    expect(domains).toHaveLength(12)
    expect(domains.filter((domain) => domain.category === 'domain')).toHaveLength(7)
    expect(domains.filter((domain) => domain.category === 'standard')).toHaveLength(2)
    expect(domains.filter((domain) => domain.category === 'reference')).toHaveLength(2)
    expect(domains.filter((domain) => domain.category === 'operations')).toHaveLength(1)
  })
})
