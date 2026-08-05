import { createInterface } from 'node:readline/promises'

// Generic interactive-prompt primitive — no knowledge of what's being asked or why.
// Commands own the questions and how to interpret the answers.
//
// Reads lines via the readline Interface's async iterator rather than repeated
// rl.question() calls. rl.question() attaches a single one-shot 'line' listener;
// if the input arrives in a burst containing several lines at once (any piped or
// scripted stdin, not just a human typing live), readline parses and emits every
// buffered line synchronously in one pass, but only the listener attached at that
// exact instant catches anything — later lines fire with no listener and are lost,
// and the next question() call then waits forever for a line that already went by.
// The async iterator instead queues emitted lines internally, so sequential reads
// stay correct regardless of how the input happens to be chunked.
export interface Prompter {
  ask(question: string): Promise<string>
  askYesNo(question: string): Promise<boolean>
  close(): void
}

export function createPrompter(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout
): Prompter {
  const rl = createInterface({ input, output })
  const lines = rl[Symbol.asyncIterator]()

  async function ask(question: string): Promise<string> {
    output.write(question)
    const { value, done } = await lines.next()
    return done ? '' : value.trim()
  }

  async function askYesNo(question: string): Promise<boolean> {
    const answer = await ask(`${question} (y/N): `)
    return answer.toLowerCase().startsWith('y')
  }

  return { ask, askYesNo, close: () => rl.close() }
}
