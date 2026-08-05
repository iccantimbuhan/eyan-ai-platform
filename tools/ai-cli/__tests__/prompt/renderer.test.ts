import { describe, expect, it, vi } from 'vitest'
import { printPrompt, renderPrompt } from '../../core/prompt/renderer.js'
import type { PromptTemplate } from '../../types/index.js'

const templateFixture: PromptTemplate = {
  id: 'fixture-template',
  title: 'Fixture Template',
  category: 'task',
  path: 'tools/ai-cli/__tests__/fixtures/sample-template.md',
}

const modifierFixture: PromptTemplate = {
  id: 'fixture-modifier',
  title: 'Fixture Modifier',
  category: 'modifier',
  path: 'tools/ai-cli/__tests__/fixtures/sample-modifier.md',
}

describe('renderPrompt', () => {
  it('substitutes variables while preserving markdown formatting', () => {
    const result = renderPrompt({
      template: templateFixture,
      variables: { feature_name: 'Prompt Engine', business_goal: 'Standardize prompts' },
    })

    expect(result).toContain('# Fixture Template')
    expect(result).toContain('Feature: Prompt Engine')
    expect(result).toContain('Business goal: Standardize prompts')
    expect(result).toContain('```ts\nconst ready = true\n```')
    expect(result).not.toContain('{{feature_name}}')
  })

  it('leaves unresolved variables untouched', () => {
    const result = renderPrompt({ template: templateFixture })
    expect(result).toContain('{{feature_name}}')
  })

  it('appends modifiers after the template, separated by a rule', () => {
    const result = renderPrompt({ template: templateFixture, modifiers: [modifierFixture] })
    expect(result.indexOf('Fixture Template')).toBeLessThan(result.indexOf('Fixture Modifier'))
    expect(result).toContain('\n\n---\n\n')
  })

  it('renders a real repository prompt unchanged when it has no placeholders', () => {
    const sessionTemplate: PromptTemplate = {
      id: 'start-session',
      title: 'Start Session',
      category: 'session',
      path: 'docs/prompts/01_START_SESSION.md',
    }
    const result = renderPrompt({ template: sessionTemplate })
    expect(result).toContain('Start Session')
    expect(result).toContain('Step 1 — Load Repository Context')
  })
})

describe('printPrompt', () => {
  it('prints the rendered result via console.log', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printPrompt({
      template: templateFixture,
      variables: { feature_name: 'X', business_goal: 'Y' },
    })
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('X'))
    logSpy.mockRestore()
  })
})
