import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SavePromptDialog } from '../../components/prompt-library/SavePromptDialog'
import { SavedPromptList } from '../../components/prompt-library/SavedPromptList'
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
        <div className='mb-8'>
          <PageHeader
            title='Prompt Library'
            description='Your saved prompts, ready to reuse.'
            breadcrumbs={[
              { label: 'Content Studio', to: '/app/content-studio' },
              { label: 'Prompt Library' },
            ]}
            actions={
              <Button
                data-presentation-target='content-studio.new-prompt'
                onClick={() => setDialogState({ open: true, prompt: null })}
              >
                <Plus className='mr-2 h-4 w-4' />
                New Prompt
              </Button>
            }
          />
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
