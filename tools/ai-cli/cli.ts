#!/usr/bin/env node
import { runHelp } from './commands/help.js'
import { runStart } from './commands/start.js'

const COMMANDS: Record<string, () => number> = {
  start: runStart,
  help: runHelp,
}

function main(): void {
  const [, , command = 'help'] = process.argv
  const run = COMMANDS[command]

  if (!run) {
    console.error(`Unknown command: ${command}`)
    console.error('Run "tools/ai help" to see available commands.')
    process.exit(1)
  }

  process.exit(run())
}

main()
