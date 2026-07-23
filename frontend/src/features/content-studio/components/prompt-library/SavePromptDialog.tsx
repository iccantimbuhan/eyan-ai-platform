import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { useCreateSavedPrompt } from '../../hooks/use-create-saved-prompt'
import { useUpdateSavedPrompt } from '../../hooks/use-update-saved-prompt'
import { CONTENT_TYPE_OPTIONS, type ContentType } from '../../types/content'
import type { SavedPrompt } from '../../types/saved-prompt'

interface SavePromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: SavedPrompt | null
}

export function SavePromptDialog({
  open,
  onOpenChange,
  prompt,
}: SavePromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keying on the open transition (rather than resetting fields via
            an effect) gives the form fresh initial state every time it
            opens, including reopening "New Prompt" back-to-back. */}
        <SavePromptForm
          key={open ? (prompt?.id ?? 'new') : 'closed'}
          prompt={prompt}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

interface SavePromptFormProps {
  prompt: SavedPrompt | null
  onSaved: () => void
}

function SavePromptForm({ prompt, onSaved }: SavePromptFormProps) {
  const isEditMode = Boolean(prompt)

  const createSavedPrompt = useCreateSavedPrompt()
  const updateSavedPrompt = useUpdateSavedPrompt()

  const [name, setName] = useState(prompt?.name ?? '')
  const [promptBody, setPromptBody] = useState(prompt?.promptBody ?? '')
  const [contentType, setContentType] = useState<ContentType>(
    prompt?.contentType ?? 'BLOG'
  )

  const isPending = createSavedPrompt.isPending || updateSavedPrompt.isPending
  const isError = createSavedPrompt.isError || updateSavedPrompt.isError
  const canSubmit = name.trim().length > 0 && promptBody.trim().length > 0

  const handleSubmit = () => {
    const payload = {
      name: name.trim(),
      promptBody: promptBody.trim(),
      contentType,
    }

    if (isEditMode && prompt) {
      updateSavedPrompt.mutate(
        { id: prompt.id, payload },
        { onSuccess: onSaved }
      )
      return
    }

    createSavedPrompt.mutate(payload, { onSuccess: onSaved })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditMode ? 'Edit Prompt' : 'Save Prompt'}</DialogTitle>

        <DialogDescription>
          {isEditMode
            ? 'Update this saved prompt.'
            : 'Save a prompt to reuse later.'}
        </DialogDescription>
      </DialogHeader>

      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='saved-prompt-name'>Name</Label>

          <Input
            id='saved-prompt-name'
            placeholder='e.g. SEO Blog Intro'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='saved-prompt-content-type'>Content Type</Label>

          <Select
            value={contentType}
            onValueChange={(value) => setContentType(value as ContentType)}
          >
            <SelectTrigger id='saved-prompt-content-type' className='w-full'>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {CONTENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='saved-prompt-body'>Prompt</Label>

          <Textarea
            id='saved-prompt-body'
            placeholder='Write the prompt text...'
            value={promptBody}
            onChange={(e) => setPromptBody(e.target.value)}
            className='min-h-32'
          />
        </div>

        {isError && (
          <p className='text-sm text-destructive'>
            Failed to save prompt. Please try again.
          </p>
        )}
      </div>

      <DialogFooter>
        <Button disabled={!canSubmit || isPending} onClick={handleSubmit}>
          {isPending ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Prompt'}
        </Button>
      </DialogFooter>
    </>
  )
}
