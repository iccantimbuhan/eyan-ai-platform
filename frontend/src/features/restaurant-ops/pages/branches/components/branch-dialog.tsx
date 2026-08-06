import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useCreateBranch, useUpdateBranch } from '../../../hooks/use-branches'
import { branchSchema, defaultBranchValues, type BranchFormValues } from '../../../schemas/branch-schema'
import type { Branch } from '../../../types/restaurant-ops'

type BranchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  branch?: Branch
}

export function BranchDialog({ open, onOpenChange, restaurantId, branch }: BranchDialogProps) {
  const isEdit = Boolean(branch)

  const createBranch = useCreateBranch(restaurantId)
  const updateBranch = useUpdateBranch()
  const isPending = createBranch.isPending || updateBranch.isPending

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: defaultBranchValues,
  })

  useEffect(() => {
    if (!open) return

    form.reset(branch ? { name: branch.name } : defaultBranchValues)
  }, [branch, form, open])

  async function onSubmit(values: BranchFormValues) {
    if (isEdit && branch) {
      await updateBranch.mutateAsync({ id: branch.id, payload: values })
    } else {
      await createBranch.mutateAsync(values)
    }

    onOpenChange(false)
  }

  const { guardedOnOpenChange, unsavedChangesDialogProps } = useUnsavedChangesGuard({
    isDirty: form.formState.isDirty,
    onOpenChange,
  })

  return (
    <>
      <Dialog open={open} onOpenChange={guardedOnOpenChange}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Branch' : 'Add Branch'}</DialogTitle>

            <DialogDescription>
              {isEdit ? 'Update this branch.' : 'Add a new physical location.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>

                    <FormControl>
                      <Input placeholder='e.g. Downtown Branch' autoFocus {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  disabled={isPending}
                  onClick={() => guardedOnOpenChange(false)}
                >
                  Cancel
                </Button>

                <Button type='submit' disabled={isPending}>
                  {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Branch'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog {...unsavedChangesDialogProps} />
    </>
  )
}
