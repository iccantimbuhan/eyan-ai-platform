import type { ContextMetadata, PromptRequest, PromptStats } from '../../types/index.js'
import { buildPrompt } from '../builder/index.js'
import { loadContextSource, resolveContext } from '../context/index.js'
import { resolvePromptTemplate } from '../prompt/registry.js'
import { classifyComplexity, countCharacters, countWords, estimateTokens } from './tokens.js'

interface ContextAnalysis {
  dedupedEntries: ContextMetadata[]
  duplicateContextsAvoided: number
  estimatedTokenSavings: number
}

// Resolves every requested context id the same way the Prompt Builder's own
// buildContextBlock does, but also measures what that dedup step throws away —
// how many duplicate entries were skipped, and how many tokens they would have
// cost had they not been deduped.
function analyzeContexts(contextIds: string[]): ContextAnalysis {
  const seen = new Set<string>()
  const dedupedEntries: ContextMetadata[] = []
  let rawCount = 0
  let estimatedTokenSavings = 0

  for (const contextId of contextIds) {
    for (const entry of resolveContext(contextId)) {
      rawCount += 1
      if (seen.has(entry.id)) {
        estimatedTokenSavings += estimateTokens(loadContextSource(entry.path))
        continue
      }
      seen.add(entry.id)
      dedupedEntries.push(entry)
    }
  }

  return {
    dedupedEntries,
    duplicateContextsAvoided: rawCount - dedupedEntries.length,
    estimatedTokenSavings,
  }
}

// Flags explicitly-requested context ids that are redundant because another
// explicitly-requested id already pulls them in as a dependency — e.g. requesting
// both 'crm' and 'coding-rules', when 'crm' already includes 'coding-rules'.
function findPossiblyUnnecessaryContextIds(contextIds: string[]): string[] {
  const requested = Array.from(new Set(contextIds))

  return requested.filter((id) =>
    requested.some(
      (otherId) => otherId !== id && resolveContext(otherId).some((entry) => entry.id === id)
    )
  )
}

// The Stats engine's only job: analyze what the Prompt Builder produces for a given
// PromptRequest. It calls buildPrompt() for the real assembled output and the Prompt
// Engine / Context Engine's existing public functions for everything else — it never
// loads or assembles anything itself, and never modifies any of the three engines.
export function analyzePromptRequest(request: PromptRequest): PromptStats {
  const template = resolvePromptTemplate(request.templateId)
  const modifiers = (request.modifierIds ?? []).map(resolvePromptTemplate)
  const contextIds = request.contextIds ?? []

  const { dedupedEntries, duplicateContextsAvoided, estimatedTokenSavings } =
    analyzeContexts(contextIds)
  const possiblyUnnecessaryContextIds = findPossiblyUnnecessaryContextIds(contextIds)

  const prompt = buildPrompt(request)
  const estimatedTokenCount = estimateTokens(prompt)
  const categories = Array.from(new Set(dedupedEntries.map((entry) => entry.category)))

  return {
    prompt: {
      templateTitle: template.title,
      contextTitles: dedupedEntries.map((entry) => entry.title),
      modifierTitles: modifiers.map((modifier) => modifier.title),
    },
    context: {
      fileCount: dedupedEntries.length,
      categories,
    },
    metrics: {
      characterCount: countCharacters(prompt),
      wordCount: countWords(prompt),
      estimatedTokenCount,
    },
    optimization: {
      duplicateContextsAvoided,
      possiblyUnnecessaryContextIds,
      complexity: classifyComplexity(estimatedTokenCount),
      estimatedTokenSavings,
    },
  }
}
