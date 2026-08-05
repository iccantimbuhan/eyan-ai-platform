#!/usr/bin/env node
import { runFeature } from './commands/feature.js'
import { runHelp } from './commands/help.js'
import { runStart } from './commands/start.js'

const COMMANDS: Record<string, () => number | Promise<number>> = {
  start: runStart,
  help: runHelp,
  feature: runFeature,
}

async function main(): Promise<void> {
  const [, , command = 'help'] = process.argv
  const run = COMMANDS[command]

  if (!run) {
    console.error(`Unknown command: ${command}`)
    console.error('Run "tools/ai help" to see available commands.')
    process.exitCode = 1
    return
  }

  // process.exitCode (not process.exit()) lets the event loop drain naturally,
  // so buffered stdout writes flush before the process exits. process.exit()
  // terminates immediately and can truncate output on a non-TTY stdout (a pipe
  // or redirected file) — invisible for a few short lines, but very visible for
  // a command like `feature` that prints a full generated prompt.
  process.exitCode = await run()
}

main()
