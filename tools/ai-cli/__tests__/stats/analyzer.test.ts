import { describe, expect, it } from 'vitest'
import { analyzePromptRequest } from '../../core/stats/analyzer.js'

describe('analyzePromptRequest', () => {
  it('resolves the template title and reports no contexts/modifiers when none are given', () => {
    const stats = analyzePromptRequest({ templateId: 'build-feature' })

    expect(stats.prompt.templateTitle).toBe('Build Feature')
    expect(stats.prompt.contextTitles).toEqual([])
    expect(stats.prompt.modifierTitles).toEqual([])
    expect(stats.context.fileCount).toBe(0)
    expect(stats.optimization.duplicateContextsAvoided).toBe(0)
    expect(stats.optimization.possiblyUnnecessaryContextIds).toEqual([])
  })

  it('reports a resolved context and its dependency', () => {
    const stats = analyzePromptRequest({ templateId: 'build-feature', contextIds: ['crm'] })

    expect(stats.prompt.contextTitles).toEqual(['CRM', 'Coding Rules'])
    expect(stats.context.fileCount).toBe(2)
    expect(stats.context.categories.sort()).toEqual(['domain', 'standard'])
  })

  it('resolves modifier titles', () => {
    const stats = analyzePromptRequest({
      templateId: 'build-feature',
      modifierIds: ['portfolio-mode'],
    })

    expect(stats.prompt.modifierTitles).toEqual(['Portfolio Mode'])
  })

  it('counts duplicate context entries avoided when two ids share a dependency', () => {
    const stats = analyzePromptRequest({
      templateId: 'build-feature',
      contextIds: ['crm', 'finance'],
    })

    expect(stats.context.fileCount).toBe(3)
    expect(stats.prompt.contextTitles).toEqual(['CRM', 'Coding Rules', 'Finance'])
    expect(stats.optimization.duplicateContextsAvoided).toBe(1)
    expect(stats.optimization.estimatedTokenSavings).toBeGreaterThan(0)
  })

  it('flags a context id that is already pulled in as a dependency of another requested id', () => {
    const stats = analyzePromptRequest({
      templateId: 'build-feature',
      contextIds: ['crm', 'coding-rules'],
    })

    expect(stats.optimization.possiblyUnnecessaryContextIds).toEqual(['coding-rules'])
  })

  it('does not flag two independent domains as unnecessary', () => {
    const stats = analyzePromptRequest({
      templateId: 'build-feature',
      contextIds: ['crm', 'finance'],
    })

    expect(stats.optimization.possiblyUnnecessaryContextIds).toEqual([])
  })

  it('derives metrics from the same output buildPrompt would produce', () => {
    const stats = analyzePromptRequest({ templateId: 'build-feature' })

    expect(stats.metrics.characterCount).toBeGreaterThan(0)
    expect(stats.metrics.wordCount).toBeGreaterThan(0)
    expect(stats.metrics.estimatedTokenCount).toBe(Math.ceil(stats.metrics.characterCount / 4))
  })

  it('classifies complexity from the estimated token count', () => {
    const stats = analyzePromptRequest({ templateId: 'build-feature' })
    const expectedComplexity =
      stats.metrics.estimatedTokenCount < 800
        ? 'Low'
        : stats.metrics.estimatedTokenCount < 2500
          ? 'Medium'
          : 'High'

    expect(stats.optimization.complexity).toBe(expectedComplexity)
  })

  it('throws on an unknown template id, matching buildPrompt', () => {
    expect(() => analyzePromptRequest({ templateId: 'does-not-exist' })).toThrow(/Unknown prompt id/)
  })

  it('never prints to the console', () => {
    const originalLog = console.log
    let called = false
    console.log = () => {
      called = true
    }
    analyzePromptRequest({ templateId: 'build-feature', contextIds: ['crm'] })
    console.log = originalLog
    expect(called).toBe(false)
  })

  it('returns a plain object', () => {
    const stats = analyzePromptRequest({ templateId: 'build-feature' })
    expect(typeof stats).toBe('object')
  })
})
