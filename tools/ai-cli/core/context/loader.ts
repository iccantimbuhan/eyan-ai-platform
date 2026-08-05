import { loadPromptSource } from '../prompt/loader.js'

// The Prompt Engine's loader is a generic "read a repo-relative file, with a
// path-traversal guard" primitive — nothing prompt-specific about it. Reusing it
// here (never modifying it) keeps that guard logic in exactly one place.
export function loadContextSource(relativePath: string): string {
  return loadPromptSource(relativePath)
}
