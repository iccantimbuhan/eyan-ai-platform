import type { CheckResult } from '../types/index.js'

export function printLine(text = ''): void {
  console.log(text)
}

export function printCheck(result: CheckResult): void {
  const mark = result.ok ? '✓' : '✗'
  const suffix = result.detail ? ` (${result.detail})` : ''
  console.log(`${mark} ${result.label}${suffix}`)
}
