import { describe, expect, it } from 'vitest'
import { classifyComplexity, countCharacters, countWords, estimateTokens } from '../../core/stats/tokens.js'

describe('countCharacters', () => {
  it('returns the string length', () => {
    expect(countCharacters('hello')).toBe(5)
    expect(countCharacters('')).toBe(0)
  })
})

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('hello world')).toBe(2)
    expect(countWords('  multiple   spaces   between  ')).toBe(3)
  })

  it('returns 0 for empty or whitespace-only input', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
  })
})

describe('estimateTokens', () => {
  it('estimates roughly one token per 4 characters, rounded up', () => {
    expect(estimateTokens('a'.repeat(8))).toBe(2)
    expect(estimateTokens('a'.repeat(9))).toBe(3)
    expect(estimateTokens('')).toBe(0)
  })
})

describe('classifyComplexity', () => {
  it('classifies below the low threshold as Low', () => {
    expect(classifyComplexity(0)).toBe('Low')
    expect(classifyComplexity(799)).toBe('Low')
  })

  it('classifies between the thresholds as Medium', () => {
    expect(classifyComplexity(800)).toBe('Medium')
    expect(classifyComplexity(2499)).toBe('Medium')
  })

  it('classifies at or above the high threshold as High', () => {
    expect(classifyComplexity(2500)).toBe('High')
    expect(classifyComplexity(10000)).toBe('High')
  })
})
