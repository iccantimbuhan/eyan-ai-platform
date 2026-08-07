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
import { useCreateStockCount } from '../../../hooks/use-inventory'
import {
  defaultStockCountValues,
  stockCountSchema,
  type StockCountFormValues,
} from '../../../schemas/inventory-schema'
import type { InventoryItem } from '../../../types/restaurant-ops'

type StockCountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem
}

export function StockCountDialog({ open, onOpenChange, item }: StockCountDialogProps) {
  const createStockCount = useCreateStockCount()

  const form = useForm<StockCountFormValues>({
    resolver: zodResolver(stockCountSchema),
    defaultValues: defaultStockCountValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(defaultStockCountValues)
  }, [open, form])

  async function onSubmit(values: StockCountFormValues) {
    await createStockCount.mutateAsync({
      inventoryItemId: item.id,
      countedQuantity: Number(values.countedQuantity),
      reason: values.reason || undefined,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Stock Count</DialogTitle>

          <DialogDescription>
            {item.ingredientName} — system quantity {item.currentQuantity} {item.unitAbbreviation}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='countedQuantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Physical Count ({item.unitAbbreviation})</FormLabel>

                  <FormControl>
                    <Input inputMode='decimal' placeholder='e.g. 4.80' autoFocus {...field} />
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
                  <FormLabel>Notes (optional)</FormLabel>

                  <FormControl>
                    <Textarea placeholder='e.g. Monthly count' {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                disabled={createStockCount.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button type='submit' disabled={createStockCount.isPending}>
                {createStockCount.isPending ? 'Saving...' : 'Record Stock Count'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
