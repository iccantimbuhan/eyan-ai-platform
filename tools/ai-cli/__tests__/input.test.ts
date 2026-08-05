import { Readable, Writable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { createPrompter } from '../core/input.js'

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

describe('ask', () => {
  it('returns the typed line, trimmed', async () => {
    const prompter = createPrompter(scriptedInput(['  Prompt Builder  ']), sink())
    await expect(prompter.ask('Feature name: ')).resolves.toBe('Prompt Builder')
    prompter.close()
  })

  it('reads every line in order, even when they all arrive in a single burst', async () => {
    const prompter = createPrompter(scriptedInput(['first', 'second', 'third']), sink())
    await expect(prompter.ask('Q1: ')).resolves.toBe('first')
    await expect(prompter.ask('Q2: ')).resolves.toBe('second')
    await expect(prompter.ask('Q3: ')).resolves.toBe('third')
    prompter.close()
  })

  it('returns an empty string once input is exhausted', async () => {
    const prompter = createPrompter(scriptedInput(['only']), sink())
    await expect(prompter.ask('Q1: ')).resolves.toBe('only')
    await expect(prompter.ask('Q2: ')).resolves.toBe('')
    prompter.close()
  })
})

describe('askYesNo', () => {
  it.each(['y', 'Y', 'yes', 'YES'])('treats "%s" as true', async (answer) => {
    const prompter = createPrompter(scriptedInput([answer]), sink())
    await expect(prompter.askYesNo('Enable Portfolio Mode?')).resolves.toBe(true)
    prompter.close()
  })

  it.each(['n', 'no', '', 'nope', 'maybe'])('treats "%s" as false', async (answer) => {
    const prompter = createPrompter(scriptedInput([answer]), sink())
    await expect(prompter.askYesNo('Enable Portfolio Mode?')).resolves.toBe(false)
    prompter.close()
  })
})
