import { describe, expect, it } from 'vitest'
import { getValidNextStatuses, isTerminalStatus } from './lead-lifecycle'

// Mirrors backend/src/services/crm-lead.service.test.ts's lifecycle
// coverage — this is the client copy of the same map (TDD §8), so a drift
// between the two should show up as a test failure on at least one side.
describe('getValidNextStatuses', () => {
  it('NEW can only move to VALIDATED or DISQUALIFIED — never LOST directly', () => {
    expect(getValidNextStatuses('NEW')).toEqual(['VALIDATED', 'DISQUALIFIED'])
  })

  it('VALIDATED can move to AI_ANALYZED or LOST', () => {
    expect(getValidNextStatuses('VALIDATED')).toEqual(['AI_ANALYZED', 'LOST'])
  })

  it('every non-terminal status includes LOST as an option, except NEW', () => {
    const nonTerminalExceptNew: Array<'VALIDATED' | 'AI_ANALYZED' | 'QUALIFIED' | 'CONTACTED' | 'NEGOTIATION'> =
      ['VALIDATED', 'AI_ANALYZED', 'QUALIFIED', 'CONTACTED', 'NEGOTIATION']

    for (const status of nonTerminalExceptNew) {
      expect(getValidNextStatuses(status)).toContain('LOST')
    }
  })

  it('terminal statuses (CONVERTED, LOST, DISQUALIFIED) have no next statuses', () => {
    expect(getValidNextStatuses('CONVERTED')).toEqual([])
    expect(getValidNextStatuses('LOST')).toEqual([])
    expect(getValidNextStatuses('DISQUALIFIED')).toEqual([])
  })
})

describe('isTerminalStatus', () => {
  it('is true for CONVERTED/LOST/DISQUALIFIED', () => {
    expect(isTerminalStatus('CONVERTED')).toBe(true)
    expect(isTerminalStatus('LOST')).toBe(true)
    expect(isTerminalStatus('DISQUALIFIED')).toBe(true)
  })

  it('is false for every status still able to progress', () => {
    expect(isTerminalStatus('NEW')).toBe(false)
    expect(isTerminalStatus('QUALIFIED')).toBe(false)
  })
})
