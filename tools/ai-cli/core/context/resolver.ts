import type { ContextMetadata } from '../../types/index.js'
import { allContextEntries, findContextEntry, toContextMetadata } from './registry.js'

export function resolveContext(id: string): ContextMetadata[] {
  const seen = new Set<string>()
  const result: ContextMetadata[] = []

  function visit(entryId: string): void {
    if (seen.has(entryId)) {
      return
    }
    seen.add(entryId)
    const entry = findContextEntry(entryId)
    result.push(toContextMetadata(entry))
    for (const includedId of entry.includes ?? []) {
      visit(includedId)
    }
  }

  visit(id)
  return result
}

export function listContextDomains(): ContextMetadata[] {
  return allContextEntries().map(toContextMetadata)
}
