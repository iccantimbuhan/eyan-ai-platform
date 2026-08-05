import type { ContextCategory, ContextMetadata } from '../../types/index.js'

interface ContextRegistryEntry {
  id: string
  title: string
  path: string
  category: ContextCategory
  description: string
  includes?: string[]
}

// Private to the Context Engine. Only registry.ts and resolver.ts should import from
// this file — future commands go through resolver.ts's and loader.ts's public
// functions instead, so this array's shape (or storage: array, map, generated) can
// change freely without breaking anything outside this directory.
//
// Derived from .context/AI_BOOTSTRAP.md's routing table: the 7 domain rows each pair
// with coding-rules.md (mirrored below via `includes`); deployment, repository-map,
// current-sprint, and architecture stand alone in that table, so they stand alone here.
const REGISTRY: ContextRegistryEntry[] = [
  {
    id: 'backend',
    title: 'Backend',
    path: '.context/backend.md',
    category: 'domain',
    description: 'Backend stack, structure, and conventions.',
    includes: ['coding-rules'],
  },
  {
    id: 'frontend',
    title: 'Frontend',
    path: '.context/frontend.md',
    category: 'domain',
    description: 'Frontend stack, structure, and conventions.',
    includes: ['coding-rules'],
  },
  {
    id: 'ai-core',
    title: 'AI Core',
    path: '.context/ai-core.md',
    category: 'domain',
    description:
      'AI Core is the centralized AI orchestration layer; business modules never call providers directly.',
    includes: ['coding-rules'],
  },
  {
    id: 'crm',
    title: 'CRM',
    path: '.context/crm.md',
    category: 'domain',
    description:
      'The CRM (leads / sales pipeline) module — file locations, pipeline flow, and rules unique to this domain.',
    includes: ['coding-rules'],
  },
  {
    id: 'finance',
    title: 'Finance',
    path: '.context/finance.md',
    category: 'domain',
    description:
      'The Finance (household expense/budget) module — file locations and rules unique to this domain.',
    includes: ['coding-rules'],
  },
  {
    id: 'content-studio',
    title: 'Content Studio',
    path: '.context/content-studio.md',
    category: 'domain',
    description:
      "The Content Studio module (content generation, images, video, Asset Library, review, publishing) — the platform's largest and most-established module.",
    includes: ['coding-rules'],
  },
  {
    id: 'automation',
    title: 'Automation',
    path: '.context/automation.md',
    category: 'domain',
    description: 'The MCP / external-connector integration layer — not the CRM→n8n pipeline.',
    includes: ['coding-rules'],
  },
  {
    id: 'deployment',
    title: 'Deployment',
    path: '.context/deployment.md',
    category: 'operations',
    description: 'How code actually reaches production, confirmed against deploy.sh directly.',
  },
  {
    id: 'repository-map',
    title: 'Repository Map',
    path: '.context/repository-map.md',
    category: 'reference',
    description: 'Where each module lives in the filesystem — consult before searching blindly.',
  },
  {
    id: 'current-sprint',
    title: 'Current Sprint',
    path: '.context/current-sprint.md',
    category: 'reference',
    description:
      'What is currently true right now for the active sprint — current state only, not history.',
  },
  {
    id: 'architecture',
    title: 'Architecture',
    path: '.context/architecture.md',
    category: 'standard',
    description:
      'The canonical, always-current architectural overview — wins over any conflicting document.',
  },
  {
    id: 'coding-rules',
    title: 'Coding Rules',
    path: '.context/coding-rules.md',
    category: 'standard',
    description: "Cross-cutting engineering rules that apply no matter which module you're touching.",
  },
]

export function findContextEntry(id: string): ContextRegistryEntry {
  const entry = REGISTRY.find((candidate) => candidate.id === id)
  if (!entry) {
    throw new Error(`Unknown context id: ${id}`)
  }
  return entry
}

export function allContextEntries(): ContextRegistryEntry[] {
  return REGISTRY
}

export function toContextMetadata(entry: ContextRegistryEntry): ContextMetadata {
  return {
    id: entry.id,
    title: entry.title,
    path: entry.path,
    category: entry.category,
    description: entry.description,
  }
}
