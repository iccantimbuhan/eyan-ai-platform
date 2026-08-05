import type { PromptRequest } from '../../types/index.js'
import { loadContextSource, resolveContext } from '../context/index.js'
import { resolvePromptTemplate } from '../prompt/registry.js'
import { renderPrompt } from '../prompt/renderer.js'
import { substituteVariables } from '../prompt/variables.js'

const SECTION_SEPARATOR = '\n\n---\n\n'

// Resolves every requested context id, drops duplicate entries that multiple ids
// pull in via shared dependencies (e.g. two domains that both include coding-rules),
// and substitutes variables the same way the Prompt Engine does for the task prompt.
function buildContextBlock(contextIds: string[], variables: PromptRequest['variables']): string {
  const seen = new Set<string>()
  const sections: string[] = []

  for (const contextId of contextIds) {
    for (const entry of resolveContext(contextId)) {
      if (seen.has(entry.id)) {
        continue
      }
      seen.add(entry.id)
      sections.push(loadContextSource(entry.path))
    }
  }

  return substituteVariables(sections.join(SECTION_SEPARATOR), variables ?? {})
}

// The Prompt Builder's only job: orchestrate the Prompt Engine and Context Engine
// into one final prompt string. It owns no loading logic of its own — every file
// read is delegated to the engines' existing public functions.
export function buildPrompt(request: PromptRequest): string {
  const template = resolvePromptTemplate(request.templateId)
  const modifiers = (request.modifierIds ?? []).map(resolvePromptTemplate)
  const promptBody = renderPrompt({ template, modifiers, variables: request.variables })

  const contextBlock = request.contextIds?.length
    ? buildContextBlock(request.contextIds, request.variables)
    : ''

  return [contextBlock, promptBody].filter(Boolean).join(SECTION_SEPARATOR)
}
