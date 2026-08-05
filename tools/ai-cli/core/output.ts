import type { CheckResult, PromptStats } from '../types/index.js'

export function printLine(text = ''): void {
  console.log(text)
}

export function printCheck(result: CheckResult): void {
  const mark = result.ok ? '✓' : '✗'
  const suffix = result.detail ? ` (${result.detail})` : ''
  console.log(`${mark} ${result.label}${suffix}`)
}

function printList(items: string[], emptyLabel: string): void {
  if (items.length === 0) {
    printLine(`  (${emptyLabel})`)
    return
  }
  items.forEach((item) => printLine(`  - ${item}`))
}

export function printStats(stats: PromptStats): void {
  printLine('Prompt')
  printLine(`  Template: ${stats.prompt.templateTitle}`)
  printLine('  Contexts:')
  printList(stats.prompt.contextTitles, 'none selected')
  printLine('  Modifiers:')
  printList(stats.prompt.modifierTitles, 'none selected')
  printLine()

  printLine('Context')
  printLine(`  Context files loaded: ${stats.context.fileCount}`)
  printLine('  Categories used:')
  printList(stats.context.categories, 'none')
  printLine()

  printLine('Metrics')
  printLine(`  Characters: ${stats.metrics.characterCount}`)
  printLine(`  Words: ${stats.metrics.wordCount}`)
  printLine(`  Estimated tokens: ${stats.metrics.estimatedTokenCount}`)
  printLine()

  printLine('Optimization')
  printLine(`  Duplicate contexts avoided: ${stats.optimization.duplicateContextsAvoided}`)
  printLine('  Contexts that may be unnecessary:')
  printList(stats.optimization.possiblyUnnecessaryContextIds, 'none')
  printLine(`  Estimated prompt complexity: ${stats.optimization.complexity}`)
  printLine(`  Estimated token savings if duplicates were removed: ${stats.optimization.estimatedTokenSavings}`)
}
