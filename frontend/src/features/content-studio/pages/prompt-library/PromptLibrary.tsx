import { useState } from 'react'
import { Plus } from 'lucide-react'

import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'

import { SavedPromptList } from '../../components/prompt-library/SavedPromptList'
import { SavePromptDialog } from '../../components/prompt-library/SavePromptDialog'
import { useDeleteSavedPrompt } from '../../hooks/use-delete-saved-prompt'
import type { SavedPrompt } from '../../types/saved-prompt'

interface DialogState {
  open: boolean
  prompt: SavedPrompt | null
}

export function PromptLibrary() {
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    prompt: null,
  })
  const [deleteTarget, setDeleteTarget] = useState<SavedPrompt | null>(null)

  const deleteSavedPrompt = useDeleteSavedPrompt()

  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-8 flex items-start justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Prompt Library
            </h1>

            <p className='mt-2 text-muted-foreground'>
              Your saved prompts, ready to reuse.
            </p>
          </div>

          <Button onClick={() => setDialogState({ open: true, prompt: null })}>
            <Plus className='mr-2 h-4 w-4' />
            New Prompt
          </Button>
        </div>

        <SavedPromptList
          onEdit={(prompt) => setDialogState({ open: true, prompt })}
          onDeleteRequest={setDeleteTarget}
        />
      </Main>

      <SavePromptDialog
        open={dialogState.open}
        onOpenChange={(open) =>
          setDialogState((previous) => ({ ...previous, open }))
        }
        prompt={dialogState.prompt}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title='Delete saved prompt?'
        desc={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.name}". This can't be undone.`
            : ''
        }
        destructive
        confirmText='Delete'
        isLoading={deleteSavedPrompt.isPending}
        handleConfirm={() => {
          if (!deleteTarget) return

          deleteSavedPrompt.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
      />
    </>
  )
}
