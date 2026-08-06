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
import { useCreateUnit, useUpdateUnit } from '../../../hooks/use-units'
import { defaultUnitValues, unitSchema, type UnitFormValues } from '../../../schemas/unit-schema'
import type { Unit } from '../../../types/restaurant-ops'

type UnitDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  unit?: Unit
}

export function UnitDialog({ open, onOpenChange, restaurantId, unit }: UnitDialogProps) {
  const isEdit = Boolean(unit)

  const createUnit = useCreateUnit(restaurantId)
  const updateUnit = useUpdateUnit()
  const isPending = createUnit.isPending || updateUnit.isPending

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: defaultUnitValues,
  })

  useEffect(() => {
    if (!open) return

    form.reset(
      unit ? { name: unit.name, abbreviation: unit.abbreviation } : defaultUnitValues
    )
  }, [unit, form, open])

  async function onSubmit(values: UnitFormValues) {
    if (isEdit && unit) {
      await updateUnit.mutateAsync({ id: unit.id, payload: values })
    } else {
      await createUnit.mutateAsync(values)
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
            <DialogTitle>{isEdit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>

            <DialogDescription>
              {isEdit ? 'Update this unit of measure.' : 'e.g. Gram, Kilogram, Piece.'}
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
                      <Input placeholder='e.g. Gram' autoFocus {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='abbreviation'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abbreviation</FormLabel>

                    <FormControl>
                      <Input placeholder='e.g. g' {...field} />
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
                  {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Unit'}
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
