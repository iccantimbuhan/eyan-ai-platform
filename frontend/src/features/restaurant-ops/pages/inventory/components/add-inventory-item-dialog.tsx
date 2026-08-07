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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useIngredients } from '../../../hooks/use-ingredients'
import { useCreateInventoryItem } from '../../../hooks/use-inventory'
import { useUnits } from '../../../hooks/use-units'
import {
  defaultInventoryItemValues,
  inventoryItemSchema,
  type InventoryItemFormValues,
} from '../../../schemas/inventory-schema'

type AddInventoryItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  branchId: string
}

// Creating an InventoryItem *is* recording opening stock — Sprint 2A never
// lets currentQuantity be set any other way at creation time (see
// ADR-0038). Editing an existing item only ever touches minimumQuantity —
// see edit-minimum-quantity-dialog.tsx.
export function AddInventoryItemDialog({
  open,
  onOpenChange,
  restaurantId,
  branchId,
}: AddInventoryItemDialogProps) {
  const { data: ingredients } = useIngredients(restaurantId)
  const { data: units } = useUnits(restaurantId)
  const createInventoryItem = useCreateInventoryItem(branchId)

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: defaultInventoryItemValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(defaultInventoryItemValues)
  }, [open, form])

  async function onSubmit(values: InventoryItemFormValues) {
    await createInventoryItem.mutateAsync({
      ingredientId: values.ingredientId,
      unitId: values.unitId,
      openingQuantity: Number(values.openingQuantity),
      minimumQuantity: Number(values.minimumQuantity),
    })

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
            <DialogTitle>Add Inventory Item</DialogTitle>

            <DialogDescription>
              Establish opening stock for an ingredient at this branch. This creates the item&rsquo;s
              first movement record.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='ingredientId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ingredient</FormLabel>

                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select an ingredient' />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {(ingredients ?? []).map((ingredient) => (
                          <SelectItem key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='unitId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>

                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a unit' />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {(units ?? []).map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name} ({unit.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-2 gap-3'>
                <FormField
                  control={form.control}
                  name='openingQuantity'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Quantity</FormLabel>

                      <FormControl>
                        <Input inputMode='decimal' placeholder='e.g. 5.00' {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='minimumQuantity'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Quantity</FormLabel>

                      <FormControl>
                        <Input inputMode='decimal' placeholder='e.g. 2.00' {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  disabled={createInventoryItem.isPending}
                  onClick={() => guardedOnOpenChange(false)}
                >
                  Cancel
                </Button>

                <Button type='submit' disabled={createInventoryItem.isPending}>
                  {createInventoryItem.isPending ? 'Saving...' : 'Add Inventory Item'}
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
