import type { RenderPromptOptions } from '../../types/index.js'
import { printLine } from '../output.js'
import { loadPromptSource } from './loader.js'
import { substituteVariables } from './variables.js'

// Consumes PromptTemplate objects, never raw paths — callers only ever deal with
// prompt IDs resolved through the registry.
export function renderPrompt(options: RenderPromptOptions): string {
  const templates = [options.template, ...(options.modifiers ?? [])]
  const combined = templates.map((template) => loadPromptSource(template.path)).join('\n\n---\n\n')

  return substituteVariables(combined, options.variables ?? {})
}

export function printPrompt(options: RenderPromptOptions): void {
  printLine(renderPrompt(options))
}
