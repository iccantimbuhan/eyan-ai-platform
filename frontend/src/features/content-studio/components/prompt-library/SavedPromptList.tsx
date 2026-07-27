import { BookOpen } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'

import { useSavedPrompts } from '../../hooks/use-saved-prompts'
import type { SavedPrompt } from '../../types/saved-prompt'
import { SavedPromptCard } from './SavedPromptCard'

interface SavedPromptListProps {
  onEdit: (prompt: SavedPrompt) => void
  onDeleteRequest: (prompt: SavedPrompt) => void
}

export function SavedPromptList({
  onEdit,
  onDeleteRequest,
}: SavedPromptListProps) {
  const { data: prompts, isLoading, isError } = useSavedPrompts()

  if (isLoading) {
    return (
      <div
        role='status'
        aria-label='Loading saved prompts'
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
        Failed to load saved prompts.
      </p>
    )
  }

  if (!prompts || prompts.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-12 text-center'>
        <BookOpen className='h-8 w-8 text-muted-foreground' />

        <p className='text-sm text-muted-foreground'>
          You haven&apos;t saved any prompts yet.
        </p>
      </div>
    )
  }

  return (
    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
      {prompts.map((prompt) => (
        <SavedPromptCard
          key={prompt.id}
          prompt={prompt}
          onEdit={onEdit}
          onDelete={onDeleteRequest}
        />
      ))}
    </div>
  )
}
