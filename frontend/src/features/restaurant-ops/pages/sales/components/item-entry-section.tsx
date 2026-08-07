import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMenuItems } from '../../../hooks/use-menu-items'
import { useCreateItemEntry, useDeleteItemEntry } from '../../../hooks/use-sales'
import {
  defaultItemEntryValues,
  itemEntrySchema,
  type ItemEntryFormValues,
} from '../../../schemas/sales-schema'
import type { SalesItemEntry } from '../../../types/restaurant-ops'

type ItemEntrySectionProps = {
  restaurantId: string
  salesId: string
  entries: SalesItemEntry[]
}

// menuItemId is optional — a manager can type "Margherita" by name without
// linking it to a MenuItem at all (spec's itemized-sales snapshot
// requirement: historical entries never depend on the MenuItem surviving).
export function ItemEntrySection({ restaurantId, salesId, entries }: ItemEntrySectionProps) {
  const { data: menuItems } = useMenuItems(restaurantId)
  const createEntry = useCreateItemEntry()
  const deleteEntry = useDeleteItemEntry()

  const form = useForm<ItemEntryFormValues>({
    resolver: zodResolver(itemEntrySchema),
    defaultValues: defaultItemEntryValues,
  })

  useEffect(() => {
    form.reset(defaultItemEntryValues)
  }, [salesId, form])

  async function onSubmit(values: ItemEntryFormValues) {
    await createEntry.mutateAsync({
      salesId,
      menuItemId: values.menuItemId || undefined,
      itemName: values.itemName,
      categoryName: values.categoryName || undefined,
      quantity: Number(values.quantity),
      amount: Number(values.amount),
    })
    form.reset(defaultItemEntryValues)
  }

  function selectMenuItem(menuItemId: string) {
    form.setValue('menuItemId', menuItemId)
    const menuItem = menuItems?.find((item) => item.id === menuItemId)
    if (menuItem) form.setValue('itemName', menuItem.name)
  }

  return (
    <div className='space-y-3'>
      <p className='text-sm font-medium'>Itemized Sales</p>

      <div className='space-y-2'>
        {entries.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No itemized sales yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className='flex items-center justify-between rounded-md border px-3 py-2'>
              <span className='text-sm'>
                {entry.quantity} &times; {entry.itemName}
                {entry.categoryName ? ` (${entry.categoryName})` : ''} &mdash; &euro;{entry.amount}
              </span>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                disabled={deleteEntry.isPending}
                onClick={() => deleteEntry.mutate({ salesId, entryId: entry.id })}
              >
                <Trash2 className='h-4 w-4 text-destructive' />
              </Button>
            </div>
          ))
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-2'>
          <div className='flex items-end gap-2'>
            <div className='flex-1 space-y-1'>
              <Select value={form.watch('menuItemId') || ''} onValueChange={selectMenuItem}>
                <SelectTrigger>
                  <SelectValue placeholder='Link a menu item (optional)' />
                </SelectTrigger>
                <SelectContent>
                  {(menuItems ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='flex items-end gap-2'>
            <FormField
              control={form.control}
              name='itemName'
              render={({ field }) => (
                <FormItem className='flex-1'>
                  <FormControl>
                    <Input placeholder='Item name' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='categoryName'
              render={({ field }) => (
                <FormItem className='w-28'>
                  <FormControl>
                    <Input placeholder='Category' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => (
                <FormItem className='w-20'>
                  <FormControl>
                    <Input inputMode='decimal' placeholder='Qty' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='amount'
              render={({ field }) => (
                <FormItem className='w-24'>
                  <FormControl>
                    <Input inputMode='decimal' placeholder='Amount' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type='submit' size='icon' aria-label='Add item entry' disabled={createEntry.isPending}>
              <Plus className='h-4 w-4' />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
