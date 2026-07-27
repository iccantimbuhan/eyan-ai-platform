import type { ContentType } from './content'

export interface PromptTemplate {
  id: string
  name: string
  category: string
  contentType: ContentType
  promptBody: string
  createdAt: string
  updatedAt: string
  isCustom?: boolean
}

/**
 * Stable internal keys for the fixed set of categories seeded on the backend.
 * Display text should always come from `template.category`, never from these keys.
 */
const CATEGORY_KEY_MAP: Record<string, string> = {
  Blogging: 'blogging',
  'Social Media': 'social',
  Marketing: 'marketing',
  'Business Communication': 'business',
}

export function getCategoryKey(category: string): string {
  return CATEGORY_KEY_MAP[category] ?? category.toLowerCase().replace(/\s+/g, '-')
}

export const CUSTOM_CATEGORY_KEY = 'custom'

/**
 * Frontend-only option representing "write your own prompt." Not backed by a
 * PromptTemplate row — see Sprint 2 Phase 1 decision to keep this out of the DB.
 */
export const CUSTOM_PROMPT_OPTION: PromptTemplate = {
  id: 'custom',
  name: 'Custom Prompt',
  category: 'Custom',
  contentType: 'BLOG',
  promptBody: '',
  createdAt: '',
  updatedAt: '',
  isCustom: true,
}
