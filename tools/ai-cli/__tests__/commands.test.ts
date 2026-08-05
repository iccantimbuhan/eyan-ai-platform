import { describe, expect, it, vi } from 'vitest'
import { runHelp } from '../commands/help.js'
import { runStart } from '../commands/start.js'

describe('commands', () => {
  it('help exits 0 and prints usage', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const code = runHelp()
    expect(code).toBe(0)
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'))
    logSpy.mockRestore()
  })

  it('start exits 0 when the repository has all required AI collaboration files', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const code = runStart()
    expect(code).toBe(0)
    expect(logSpy).toHaveBeenCalledWith('Repository: Ready')
    logSpy.mockRestore()
  })
})
