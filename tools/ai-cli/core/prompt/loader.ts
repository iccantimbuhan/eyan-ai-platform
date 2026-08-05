import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { REPO_ROOT } from '../repository.js'

// Generic "read a repository file by relative path" primitive. Deliberately unaware of
// docs/prompts/ or any other directory — future prompt sources need no engine changes,
// callers just point at a different path.
export function loadPromptSource(relativePath: string): string {
  const target = path.resolve(REPO_ROOT, relativePath)

  if (!target.startsWith(REPO_ROOT + path.sep)) {
    throw new Error(`Refusing to load path outside the repository: ${relativePath}`)
  }

  if (!existsSync(target)) {
    throw new Error(`Prompt source not found: ${relativePath}`)
  }

  return readFileSync(target, 'utf-8')
}
