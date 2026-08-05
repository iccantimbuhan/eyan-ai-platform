import { describe, expect, it } from 'vitest'
import * as StatsEngine from '../../core/stats/index.js'

describe('Stats Engine public API', () => {
  it('exposes exactly analyzePromptRequest', () => {
    expect(Object.keys(StatsEngine).sort()).toEqual(['analyzePromptRequest'])
  })

  it('analyzePromptRequest works through the public barrel', () => {
    const stats = StatsEngine.analyzePromptRequest({ templateId: 'build-feature' })
    expect(stats.prompt.templateTitle).toBe('Build Feature')
  })
})
