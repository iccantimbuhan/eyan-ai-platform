import { Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import type { PromptTemplate } from '../../types/prompt-template'

interface TemplateCardProps {
  template: PromptTemplate
  isSelected: boolean
  onSelect: (template: PromptTemplate) => void
}

export function TemplateCard({
  template,
  isSelected,
  onSelect,
}: TemplateCardProps) {
  return (
    <Card
      role='button'
      tabIndex={0}
      aria-pressed={isSelected}
      className={cn(
        'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={() => onSelect(template)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(template)
        }
      }}
    >
      <CardContent className='space-y-3 p-4'>
        <div className='flex items-center justify-between'>
          <Sparkles className='h-5 w-5 text-primary' />
          <Badge variant='outline'>{template.category}</Badge>
        </div>

        <div>
          <h3 className='font-semibold'>{template.name}</h3>

          {!template.isCustom && (
            <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
              {template.promptBody}
            </p>
          )}

          {template.isCustom && (
            <p className='mt-1 text-xs text-muted-foreground'>
              Write your own prompt from scratch.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
