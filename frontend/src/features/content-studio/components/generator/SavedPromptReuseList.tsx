import { useSavedPrompts } from '../../hooks/use-saved-prompts'
import type { SavedPrompt } from '../../types/saved-prompt'
import { SavedPromptCard } from '../prompt-library/SavedPromptCard'

interface SavedPromptReuseListProps {
  onSelect: (prompt: SavedPrompt) => void
}

/**
 * A compact, optional strip shown above the custom-prompt fields. Hidden
 * entirely while loading, on error, or when the user has no saved prompts —
 * this is a secondary shortcut, not a required step in the generation flow.
 */
export function SavedPromptReuseList({ onSelect }: SavedPromptReuseListProps) {
  const { data: prompts, isLoading, isError } = useSavedPrompts()

  if (isLoading || isError || !prompts || prompts.length === 0) {
    return null
  }

  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium'>Reuse a Saved Prompt</p>

      <div className='grid gap-2 sm:grid-cols-2'>
        {prompts.map((prompt) => (
          <SavedPromptCard key={prompt.id} prompt={prompt} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}
