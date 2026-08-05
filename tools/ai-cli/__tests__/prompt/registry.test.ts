import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { listPromptTemplates, resolvePromptTemplate } from '../../core/prompt/registry.js'
import { REPO_ROOT } from '../../core/repository.js'

describe('prompt registry', () => {
  it('resolves a known id to a PromptTemplate', () => {
    const template = resolvePromptTemplate('build-feature')
    expect(template.id).toBe('build-feature')
    expect(template.category).toBe('task')
    expect(template.path).toBe('docs/prompts/02_BUILD_FEATURE.md')
    expect(template.title).toBe('Build Feature')
  })

  it('throws on an unknown id', () => {
    expect(() => resolvePromptTemplate('does-not-exist')).toThrow(/Unknown prompt id/)
  })

  it('lists all registered templates across the expected categories', () => {
    const templates = listPromptTemplates()
    expect(templates).toHaveLength(10)
    expect(templates.filter((template) => template.category === 'session')).toHaveLength(1)
    expect(templates.filter((template) => template.category === 'modifier')).toHaveLength(1)
    expect(templates.filter((template) => template.category === 'task')).toHaveLength(8)
  })

  it('every registered path exists on disk', () => {
    for (const template of listPromptTemplates()) {
      expect(existsSync(path.join(REPO_ROOT, template.path))).toBe(true)
    }
  })
})
