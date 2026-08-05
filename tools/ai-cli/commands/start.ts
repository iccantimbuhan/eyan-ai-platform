import { getRepoInfo } from '../core/context.js'
import { printCheck, printLine } from '../core/output.js'
import { runRepositoryChecks } from '../core/repository.js'

export function runStart(): number {
  const results = runRepositoryChecks()
  const allOk = results.every((result) => result.ok)
  const info = getRepoInfo()

  printLine('Eyan AI CLI')
  printLine()
  printLine(`Repository: ${allOk ? 'Ready' : 'Not Ready'}`)
  if (info.nodeEngine || info.packageManager) {
    printLine(`Node ${info.nodeEngine ?? 'unknown'} · ${info.packageManager ?? 'unknown'}`)
  }
  printLine()

  for (const result of results) {
    printCheck(result)
  }

  printLine()

  if (allOk) {
    printLine('Ready to begin an AI engineering session.')
    return 0
  }

  printLine('Missing required AI collaboration files — see ✗ items above.')
  return 1
}
