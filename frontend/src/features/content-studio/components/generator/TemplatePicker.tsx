import { useEffect, useMemo, useRef, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { useTemplates } from '../../hooks/use-templates'
import {
  CUSTOM_CATEGORY_KEY,
  CUSTOM_PROMPT_OPTION,
  getCategoryKey,
  type PromptTemplate,
} from '../../types/prompt-template'
import { TemplateCard } from './TemplateCard'

interface TemplatePickerProps {
  selectedTemplateId: string | null
  recentTemplateIds: string[]
  lastTemplateId: string | null
  onSelect: (template: PromptTemplate) => void
}

const ALL_CATEGORY_KEY = 'all'
const RECENT_CATEGORY_KEY = 'recent'

export function TemplatePicker({
  selectedTemplateId,
  recentTemplateIds,
  lastTemplateId,
  onSelect,
}: TemplatePickerProps) {
  const { data: templates, isLoading, isError } = useTemplates()
  const [activeCategory, setActiveCategory] = useState<string>(
    ALL_CATEGORY_KEY
  )
  const hasRestoredSelection = useRef(false)

  // Restore the last-selected template (if any) once templates have loaded.
  // Runs at most once per mount, and never overrides an explicit selection.
  useEffect(() => {
    if (hasRestoredSelection.current || selectedTemplateId || !lastTemplateId) {
      return
    }
    if (isLoading) return

    hasRestoredSelection.current = true

    if (lastTemplateId === CUSTOM_PROMPT_OPTION.id) {
      onSelect(CUSTOM_PROMPT_OPTION)
      return
    }

    const match = templates?.find((template) => template.id === lastTemplateId)
    if (match) onSelect(match)
  }, [templates, isLoading, selectedTemplateId, lastTemplateId, onSelect])

  const categories = useMemo(() => {
    const unique = new Map<string, string>()

    for (const template of templates ?? []) {
      unique.set(getCategoryKey(template.category), template.category)
    }

    return Array.from(unique.entries())
  }, [templates])

  const recentTemplates = useMemo(() => {
    if (!templates) return []

    return recentTemplateIds
      .map((id) => templates.find((template) => template.id === id))
      .filter((template): template is PromptTemplate => Boolean(template))
  }, [templates, recentTemplateIds])

  if (isLoading) {
    return (
      <div
        role='status'
        aria-label='Loading templates'
        className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className='h-28 w-full' />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className='text-sm text-destructive'>
        Failed to load templates. You can still write a custom prompt below.
      </p>
    )
  }

  const options: PromptTemplate[] = [...(templates ?? []), CUSTOM_PROMPT_OPTION]

  const visibleOptions =
    activeCategory === ALL_CATEGORY_KEY
      ? options
      : activeCategory === RECENT_CATEGORY_KEY
        ? recentTemplates
        : options.filter(
            (template) => getCategoryKey(template.category) === activeCategory
          )

  return (
    <Tabs value={activeCategory} onValueChange={setActiveCategory}>
      <TabsList className='flex h-auto flex-wrap justify-start gap-1'>
        <TabsTrigger value={ALL_CATEGORY_KEY}>All</TabsTrigger>

        {recentTemplates.length > 0 && (
          <TabsTrigger value={RECENT_CATEGORY_KEY}>Recent</TabsTrigger>
        )}

        {categories.map(([key, label]) => (
          <TabsTrigger key={key} value={key}>
            {label}
          </TabsTrigger>
        ))}

        <TabsTrigger value={CUSTOM_CATEGORY_KEY}>Custom</TabsTrigger>
      </TabsList>

      <TabsContent value={activeCategory} className='mt-4'>
        {visibleOptions.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            {activeCategory === RECENT_CATEGORY_KEY
              ? 'No recently used templates yet.'
              : 'No templates in this category.'}
          </p>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {visibleOptions.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={template.id === selectedTemplateId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
