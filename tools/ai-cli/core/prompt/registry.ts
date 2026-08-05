import type { PromptCategory, PromptTemplate } from '../../types/index.js'
import { loadPromptSource } from './loader.js'

interface PromptRegistryEntry {
  id: string
  category: PromptCategory
  path: string
}

// Maps logical prompt IDs to repository files. Future commands work with IDs only —
// they never see or construct a path themselves. Adding a prompt is one entry here;
// nothing outside this file needs to change.
const REGISTRY: PromptRegistryEntry[] = [
  { id: 'start-session', category: 'session', path: 'docs/prompts/01_START_SESSION.md' },
  { id: 'build-feature', category: 'task', path: 'docs/prompts/02_BUILD_FEATURE.md' },
  { id: 'fix-bug', category: 'task', path: 'docs/prompts/03_FIX_BUG.md' },
  { id: 'refactor', category: 'task', path: 'docs/prompts/04_REFACTOR.md' },
  { id: 'code-review', category: 'task', path: 'docs/prompts/05_CODE_REVIEW.md' },
  { id: 'architecture', category: 'task', path: 'docs/prompts/06_ARCHITECTURE.md' },
  { id: 'debug', category: 'task', path: 'docs/prompts/07_DEBUG.md' },
  { id: 'release', category: 'task', path: 'docs/prompts/08_RELEASE.md' },
  { id: 'portfolio-mode', category: 'modifier', path: 'docs/prompts/09_PORTFOLIO_MODE.md' },
  { id: 'repository-audit', category: 'task', path: 'docs/prompts/10_REPOSITORY_AUDIT.md' },
]

function extractTitle(source: string, fallbackId: string): string {
  const match = source.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : fallbackId
}

function findEntry(id: string): PromptRegistryEntry {
  const entry = REGISTRY.find((candidate) => candidate.id === id)
  if (!entry) {
    throw new Error(`Unknown prompt id: ${id}`)
  }
  return entry
}

export function resolvePromptTemplate(id: string): PromptTemplate {
  const entry = findEntry(id)
  const source = loadPromptSource(entry.path)

  return {
    id: entry.id,
    title: extractTitle(source, entry.id),
    category: entry.category,
    path: entry.path,
  }
}

export function listPromptTemplates(): PromptTemplate[] {
  return REGISTRY.map((entry) => resolvePromptTemplate(entry.id))
}
