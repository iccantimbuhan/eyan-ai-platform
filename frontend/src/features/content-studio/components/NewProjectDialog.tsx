import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { projectsApi } from '../api/projects.api'

export function NewProjectDialog() {
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const createProject = useMutation({
    mutationFn: () =>
      projectsApi.createProject({
        name,
      }),

    onSuccess: async () => {
      setName('')
      setOpen(false)

      await queryClient.invalidateQueries({
        queryKey: ['content-projects'],
      })
    },
  })

  const { guardedOnOpenChange, unsavedChangesDialogProps } =
    useUnsavedChangesGuard({
      isDirty: name.trim() !== '',
      onOpenChange: setOpen,
    })

  return (
    <>
      <Dialog open={open} onOpenChange={guardedOnOpenChange}>
        <DialogTrigger asChild>
          <Button data-presentation-target='content-studio.new-project'>
            <Plus className='mr-2 h-4 w-4' />
            New Project
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>

            <DialogDescription>
              Create a new content workspace.
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder='Project name'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <DialogFooter>
            <Button
              disabled={!name.trim() || createProject.isPending}
              onClick={() => createProject.mutate()}
            >
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog {...unsavedChangesDialogProps} />
    </>
  )
}
