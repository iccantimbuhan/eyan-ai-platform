import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useUpdateInventoryItem } from '../../../hooks/use-inventory'
import { minimumQuantitySchema, type MinimumQuantityFormValues } from '../../../schemas/inventory-schema'
import type { InventoryItem } from '../../../types/restaurant-ops'

type EditMinimumQuantityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem
}

export function EditMinimumQuantityDialog({
  open,
  onOpenChange,
  item,
}: EditMinimumQuantityDialogProps) {
  const updateInventoryItem = useUpdateInventoryItem()

  const form = useForm<MinimumQuantityFormValues>({
    resolver: zodResolver(minimumQuantitySchema),
    defaultValues: { minimumQuantity: item.minimumQuantity },
  })

  useEffect(() => {
    if (!open) return
    form.reset({ minimumQuantity: item.minimumQuantity })
  }, [open, item, form])

  async function onSubmit(values: MinimumQuantityFormValues) {
    await updateInventoryItem.mutateAsync({
      id: item.id,
      minimumQuantity: Number(values.minimumQuantity),
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Edit Minimum Stock Threshold</DialogTitle>

          <DialogDescription>{item.ingredientName}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='minimumQuantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Quantity ({item.unitAbbreviation})</FormLabel>

                  <FormControl>
                    <Input inputMode='decimal' autoFocus {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                disabled={updateInventoryItem.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button type='submit' disabled={updateInventoryItem.isPending}>
                {updateInventoryItem.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
