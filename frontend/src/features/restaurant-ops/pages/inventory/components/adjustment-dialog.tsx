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
import { Textarea } from '@/components/ui/textarea'
import { useCreateAdjustment } from '../../../hooks/use-inventory'
import {
  adjustmentSchema,
  defaultAdjustmentValues,
  type AdjustmentFormValues,
} from '../../../schemas/inventory-schema'
import type { InventoryItem } from '../../../types/restaurant-ops'

type AdjustmentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem
}

export function AdjustmentDialog({ open, onOpenChange, item }: AdjustmentDialogProps) {
  const createAdjustment = useCreateAdjustment()

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: defaultAdjustmentValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(defaultAdjustmentValues)
  }, [open, form])

  async function onSubmit(values: AdjustmentFormValues) {
    await createAdjustment.mutateAsync({
      inventoryItemId: item.id,
      quantityDelta: Number(values.quantityDelta),
      reason: values.reason,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>

          <DialogDescription>
            {item.ingredientName} — currently {item.currentQuantity} {item.unitAbbreviation}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='quantityDelta'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment ({item.unitAbbreviation})</FormLabel>

                  <FormControl>
                    <Input inputMode='decimal' placeholder='e.g. -0.50' autoFocus {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='reason'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>

                  <FormControl>
                    <Textarea placeholder='e.g. Damaged product' {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                disabled={createAdjustment.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button type='submit' disabled={createAdjustment.isPending}>
                {createAdjustment.isPending ? 'Saving...' : 'Record Adjustment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
