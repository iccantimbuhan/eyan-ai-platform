import { describe, expect, it } from 'vitest'
import { buildPrompt } from '../../core/builder/index.js'

describe('buildPrompt', () => {
  it('returns the template content unchanged when no context, modifiers, or variables are given', () => {
    const result = buildPrompt({ templateId: 'start-session' })
    expect(result).toContain('Start Session')
    expect(result).toContain('Step 1 — Load Repository Context')
  })

  it('throws on an unknown template id', () => {
    expect(() => buildPrompt({ templateId: 'does-not-exist' })).toThrow(/Unknown prompt id/)
  })

  it('throws on an unknown context id', () => {
    expect(() =>
      buildPrompt({ templateId: 'start-session', contextIds: ['does-not-exist'] })
    ).toThrow(/Unknown context id/)
  })

  it('appends a modifier after the template, separated by a rule', () => {
    const result = buildPrompt({ templateId: 'build-feature', modifierIds: ['portfolio-mode'] })
    expect(result.indexOf('Build Feature')).toBeLessThan(result.indexOf('Portfolio Mode'))
    expect(result).toContain('\n\n---\n\n')
  })

  it('places the resolved context block before the task prompt', () => {
    const result = buildPrompt({ templateId: 'build-feature', contextIds: ['crm'] })
    expect(result.indexOf('# CRM')).toBeLessThan(result.indexOf('# Build Feature'))
    expect(result).toContain('# Coding Rules')
  })

  it('deduplicates context entries shared across multiple requested context ids', () => {
    const result = buildPrompt({ templateId: 'start-session', contextIds: ['crm', 'finance'] })
    const codingRulesOccurrences = result.split('# Coding Rules').length - 1
    expect(codingRulesOccurrences).toBe(1)
    expect(result).toContain('# CRM')
    expect(result).toContain('# Finance')
  })

  it('substitutes variables and never throws when variables are omitted', () => {
    expect(() => buildPrompt({ templateId: 'build-feature' })).not.toThrow()
    const result = buildPrompt({ templateId: 'build-feature', variables: { anything: 'value' } })
    expect(result).toContain('Build Feature')
  })

  it('never prints to the console', () => {
    const originalLog = console.log
    let called = false
    console.log = () => {
      called = true
    }
    buildPrompt({ templateId: 'start-session', contextIds: ['architecture'] })
    console.log = originalLog
    expect(called).toBe(false)
  })

  it('returns a plain string', () => {
    expect(typeof buildPrompt({ templateId: 'start-session' })).toBe('string')
  })
})
