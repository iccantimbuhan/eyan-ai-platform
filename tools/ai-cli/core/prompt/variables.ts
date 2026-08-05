import type { PromptVariables } from '../../types/index.js'

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

// Single left-to-right pass over the raw text — no markdown parsing, so spacing, code
// fences, and formatting are preserved by construction. A replacement value that itself
// contains "{{...}}" is never re-scanned, since String#replace doesn't revisit output.
export function substituteVariables(template: string, variables: PromptVariables): string {
  return template.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    if (!(key in variables)) {
      return match
    }
    return String(variables[key])
  })
}
