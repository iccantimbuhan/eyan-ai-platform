import { useCallback, useState } from 'react'

import type { PromptTemplate } from '../types/prompt-template'

const LAST_TEMPLATE_KEY = 'content-studio:last-template-id'
const RECENT_TEMPLATES_KEY = 'content-studio:recent-template-ids'
const MAX_RECENT_TEMPLATES = 5

function readLastTemplateId(): string | null {
  try {
    return localStorage.getItem(LAST_TEMPLATE_KEY)
  } catch {
    return null
  }
}

function readRecentTemplateIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_TEMPLATES_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded) —
    // remembering the last/recent template is a convenience, not required.
  }
}

/**
 * Tracks the last-selected template and a most-recently-used list, both
 * persisted to localStorage only (no backend). The "Custom Prompt" option
 * is remembered as the last selection but never appears in recents.
 */
export function useRecentTemplates() {
  const [lastTemplateId, setLastTemplateId] = useState<string | null>(
    readLastTemplateId
  )
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>(
    readRecentTemplateIds
  )

  const recordTemplateUse = useCallback((template: PromptTemplate) => {
    writeStorage(LAST_TEMPLATE_KEY, template.id)
    setLastTemplateId(template.id)

    if (template.isCustom) return

    setRecentTemplateIds((previous) => {
      const next = [
        template.id,
        ...previous.filter((id) => id !== template.id),
      ].slice(0, MAX_RECENT_TEMPLATES)

      writeStorage(RECENT_TEMPLATES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { lastTemplateId, recentTemplateIds, recordTemplateUse }
}
