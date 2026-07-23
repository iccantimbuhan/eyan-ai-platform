import { Pencil, Sparkles, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { CONTENT_TYPE_OPTIONS } from '../../types/content'
import type { SavedPrompt } from '../../types/saved-prompt'

interface SavedPromptCardProps {
  prompt: SavedPrompt
  onSelect?: (prompt: SavedPrompt) => void
  onEdit?: (prompt: SavedPrompt) => void
  onDelete?: (prompt: SavedPrompt) => void
}

function contentTypeLabel(contentType: SavedPrompt['contentType']) {
  return (
    CONTENT_TYPE_OPTIONS.find((option) => option.value === contentType)
      ?.label ?? contentType
  )
}

export function SavedPromptCard({
  prompt,
  onSelect,
  onEdit,
  onDelete,
}: SavedPromptCardProps) {
  const isSelectable = Boolean(onSelect)

  return (
    <Card
      role={isSelectable ? 'button' : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      className={cn(
        isSelectable &&
          'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md'
      )}
      onClick={isSelectable ? () => onSelect?.(prompt) : undefined}
      onKeyDown={
        isSelectable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect?.(prompt)
              }
            }
          : undefined
      }
    >
      <CardContent className='space-y-3 p-4'>
        <div className='flex items-center justify-between'>
          <Sparkles className='h-5 w-5 text-primary' />
          <Badge variant='outline'>{contentTypeLabel(prompt.contentType)}</Badge>
        </div>

        <div>
          <h3 className='font-semibold'>{prompt.name}</h3>

          <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
            {prompt.promptBody}
          </p>
        </div>

        {(onEdit || onDelete) && (
          <div className='flex justify-end gap-1'>
            {onEdit && (
              <Button
                variant='ghost'
                size='icon'
                aria-label={`Edit ${prompt.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(prompt)
                }}
              >
                <Pencil className='h-4 w-4' />
              </Button>
            )}

            {onDelete && (
              <Button
                variant='ghost'
                size='icon'
                aria-label={`Delete ${prompt.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(prompt)
                }}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
