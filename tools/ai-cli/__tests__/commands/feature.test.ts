import { Readable, Writable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { runFeature } from '../../commands/feature.js'

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

describe('runFeature', () => {
  it('collects input, builds a PromptRequest, and prints the assembled prompt', async () => {
    const input = scriptedInput([
      'Prompt Builder CLI',
      'Let engineers generate consistent prompts from the terminal',
      'Wire an interactive feature command onto the existing Prompt Builder',
      '4,5',
      'y',
    ])
    const capture = captureConsoleLog()

    const code = await runFeature(input, sink())
    capture.spy.mockRestore()

    expect(code).toBe(0)
    expect(capture.text).toContain('Repository contexts:')
    expect(capture.text).toContain('# CRM')
    expect(capture.text).toContain('# Finance')
    expect(capture.text).toContain('# Coding Rules')
    expect(capture.text).toContain('# Build Feature')
    expect(capture.text).toContain('# Portfolio Mode')
  })

  it('omits context and the portfolio-mode modifier when both are declined', async () => {
    const input = scriptedInput(['No Context Feature', 'Business goal', 'Technical goal', '', 'n'])
    const capture = captureConsoleLog()

    const code = await runFeature(input, sink())
    capture.spy.mockRestore()

    expect(code).toBe(0)
    expect(capture.text).toContain('# Build Feature')
    expect(capture.text).not.toContain('# Portfolio Mode')
    expect(capture.text).not.toContain('# CRM')
  })

  it('ignores out-of-range or non-numeric context selections without crashing', async () => {
    const input = scriptedInput(['Feature', 'Goal', 'Goal', '99, abc', 'n'])
    const capture = captureConsoleLog()

    const code = await runFeature(input, sink())
    capture.spy.mockRestore()

    expect(code).toBe(0)
    expect(capture.text).toContain('# Build Feature')
  })

  it('displays the full numbered context list before asking for a selection', async () => {
    const input = scriptedInput(['Feature', 'Goal', 'Goal', '', 'n'])
    const capture = captureConsoleLog()

    await runFeature(input, sink())
    capture.spy.mockRestore()

    expect(capture.text).toContain('1) Backend')
    expect(capture.text).toContain('12) Coding Rules')
  })
})
