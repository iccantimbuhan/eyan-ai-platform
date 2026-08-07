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
import { useCreateWaste } from '../../../hooks/use-inventory'
import { defaultWasteValues, wasteSchema, type WasteFormValues } from '../../../schemas/inventory-schema'
import type { InventoryItem } from '../../../types/restaurant-ops'

type WasteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem
}

export function WasteDialog({ open, onOpenChange, item }: WasteDialogProps) {
  const createWaste = useCreateWaste()

  const form = useForm<WasteFormValues>({
    resolver: zodResolver(wasteSchema),
    defaultValues: defaultWasteValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(defaultWasteValues)
  }, [open, form])

  async function onSubmit(values: WasteFormValues) {
    await createWaste.mutateAsync({
      inventoryItemId: item.id,
      quantity: Number(values.quantity),
      reason: values.reason,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Record Waste</DialogTitle>

          <DialogDescription>
            {item.ingredientName} — currently {item.currentQuantity} {item.unitAbbreviation}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Wasted ({item.unitAbbreviation})</FormLabel>

                  <FormControl>
                    <Input inputMode='decimal' placeholder='e.g. 0.50' autoFocus {...field} />
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
                    <Textarea placeholder='e.g. Spoiled' {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                disabled={createWaste.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button type='submit' disabled={createWaste.isPending}>
                {createWaste.isPending ? 'Saving...' : 'Record Waste'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
