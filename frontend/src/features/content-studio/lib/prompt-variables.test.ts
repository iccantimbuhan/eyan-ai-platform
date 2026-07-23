import { describe, expect, it } from 'vitest'

import { extractVariables, substituteVariables } from './prompt-variables'

describe('extractVariables', () => {
  it('returns unique variable names in order of first appearance', () => {
    const promptBody =
      'Write a blog post about {{topic}} for {{business}} covering {{topic}} in depth.'

    expect(extractVariables(promptBody)).toEqual(['topic', 'business'])
  })

  it('returns an empty array when there are no variables', () => {
    expect(extractVariables('Write a blog post.')).toEqual([])
  })

  it('tolerates extra whitespace inside the token', () => {
    expect(extractVariables('Write about {{  topic  }}.')).toEqual(['topic'])
  })

  it('extracts correctly across repeated calls (no shared regex state)', () => {
    const promptBody = 'About {{topic}} for {{business}}.'

    expect(extractVariables(promptBody)).toEqual(['topic', 'business'])
    expect(extractVariables(promptBody)).toEqual(['topic', 'business'])
  })
})

describe('substituteVariables', () => {
  it('replaces each token with its matching value', () => {
    const promptBody = 'Write a blog post about {{topic}} for {{business}}.'

    expect(
      substituteVariables(promptBody, {
        topic: 'renewable energy',
        business: 'Acme Corp',
      })
    ).toBe('Write a blog post about renewable energy for Acme Corp.')
  })

  it('resolves missing values to an empty string', () => {
    const promptBody = 'Write about {{topic}}.'

    expect(substituteVariables(promptBody, {})).toBe('Write about .')
  })

  it('substitutes correctly across repeated calls (no shared regex state)', () => {
    const promptBody = 'About {{topic}}.'

    expect(substituteVariables(promptBody, { topic: 'AI' })).toBe(
      'About AI.'
    )
    expect(substituteVariables(promptBody, { topic: 'AI' })).toBe(
      'About AI.'
    )
  })
})
