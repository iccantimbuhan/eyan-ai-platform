import { Readable, Writable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { runStats } from '../../commands/stats.js'

function scriptedInput(lines: string[]): Readable {
  return Readable.from(lines.map((line) => `${line}\n`))
}

function sink(): Writable {
  return new Writable({
    write(_chunk, _encoding, callback) {
      callback()
    },
  })
}

function captureConsoleLog() {
  const lines: string[] = []
  const spy = vi.spyOn(console, 'log').mockImplementation((text: string = '') => {
    lines.push(text)
  })
  return {
    spy,
    get text(): string {
      return lines.join('\n')
    },
  }
}

describe('runStats', () => {
  it('collects input, analyzes the resulting PromptRequest, and prints the stats report', async () => {
    const input = scriptedInput([
      'Prompt Builder CLI',
      'Let engineers generate consistent prompts from the terminal',
      'Wire an interactive feature command onto the existing Prompt Builder',
      '4,5',
      'y',
    ])
    const capture = captureConsoleLog()

    const code = await runStats(input, sink())
    capture.spy.mockRestore()

    expect(code).toBe(0)
    expect(capture.text).toContain('Repository contexts:')
    expect(capture.text).toContain('Prompt')
    expect(capture.text).toContain('Template: Build Feature')
    expect(capture.text).toContain('CRM')
    expect(capture.text).toContain('Finance')
    expect(capture.text).toContain('Portfolio Mode')
    expect(capture.text).toContain('Context')
    expect(capture.text).toContain('Metrics')
    expect(capture.text).toContain('Optimization')
    expect(capture.text).not.toContain('# Build Feature')
  })

  it('reports zero contexts and no modifiers when both are declined', async () => {
    const input = scriptedInput(['No Context Feature', 'Business goal', 'Technical goal', '', 'n'])
    const capture = captureConsoleLog()

    const code = await runStats(input, sink())
    capture.spy.mockRestore()

    expect(code).toBe(0)
    expect(capture.text).toContain('Context files loaded: 0')
    expect(capture.text).toContain('(none selected)')
  })
})
