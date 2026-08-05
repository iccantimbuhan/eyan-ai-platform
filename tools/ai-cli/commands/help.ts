import { printLine } from '../core/output.js'

export function runHelp(): number {
  printLine('Eyan AI CLI')
  printLine()
  printLine('Usage: tools/ai <command>')
  printLine()
  printLine('Commands:')
  printLine('  start      Verify the repository is ready for an AI engineering session')
  printLine('  feature    Build a feature prompt via the Prompt Builder')
  printLine('  help       Show this message')
  printLine()
  printLine('Also available (routed to the existing aider-based workflows):')
  printLine('  review, architect, code, doctor, models')
  printLine()
  printLine('More ai:* commands (bug, review, audit, doctor, stats) land in future sprints.')
  return 0
}
