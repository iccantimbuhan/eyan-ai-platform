import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMenuCategories } from '../../../hooks/use-menu-categories'
import { useMenuItems } from '../../../hooks/use-menu-items'
import { useSalesChannelMenuItems, useSalesChannels } from '../../../hooks/use-sales-reference'
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

const UNFILTERED = '__all__'

// menuItemId is optional — a manager can still type "Margherita" by name
// without linking it to a MenuItem at all (spec's itemized-sales snapshot
// requirement: historical entries never depend on the MenuItem surviving).
// Category and Sales Channel below are pure UI convenience — neither is
// part of the submitted payload; selecting a channel only changes which
// price gets suggested when a menu item is picked, and the manager can
// always override Amount afterward.
export function ItemEntrySection({ restaurantId, salesId, entries }: ItemEntrySectionProps) {
  const { data: categories } = useMenuCategories(restaurantId)
  const { data: menuItems } = useMenuItems(restaurantId)
  const { data: salesChannels } = useSalesChannels(restaurantId)
  const { data: channelPrices } = useSalesChannelMenuItems(restaurantId)
  const createEntry = useCreateItemEntry()
  const deleteEntry = useDeleteItemEntry()

  const [selectedChannelId, setSelectedChannelId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  const form = useForm<ItemEntryFormValues>({
    resolver: zodResolver(itemEntrySchema),
    defaultValues: defaultItemEntryValues,
  })

  useEffect(() => {
    form.reset(defaultItemEntryValues)
    setSelectedChannelId('')
    setSelectedCategoryId('')
  }, [salesId, form])

  const filteredMenuItems = selectedCategoryId
    ? (menuItems ?? []).filter((item) => item.menuCategoryId === selectedCategoryId)
    : (menuItems ?? [])

  function selectCategory(menuCategoryId: string) {
    const value = menuCategoryId === UNFILTERED ? '' : menuCategoryId
    setSelectedCategoryId(value)

    // A previously-picked menu item that no longer belongs to the newly
    // selected category is cleared — the dropdown it came from would no
    // longer show it, so leaving it selected would be confusing.
    const currentMenuItemId = form.getValues('menuItemId')
    const currentItem = (menuItems ?? []).find((item) => item.id === currentMenuItemId)
    if (currentItem && value && currentItem.menuCategoryId !== value) {
      form.setValue('menuItemId', '')
    }
  }

  function selectMenuItem(menuItemId: string) {
    form.setValue('menuItemId', menuItemId)

    const menuItem = menuItems?.find((item) => item.id === menuItemId)
    if (!menuItem) return

    form.setValue('itemName', menuItem.name)

    const category = categories?.find((c) => c.id === menuItem.menuCategoryId)
    if (category) form.setValue('categoryName', category.name)

    // Channel-aware default price: an available override for the selected
    // channel wins, otherwise fall back to the MenuItem's own base price.
    // This only sets the *default* — the manager can still freely edit
    // Amount, since the actual sales-channel price may differ from either.
    const override = selectedChannelId
      ? channelPrices?.find(
          (cp) => cp.salesChannelId === selectedChannelId && cp.menuItemId === menuItemId && cp.available
        )
      : undefined
    const defaultPrice = override?.price ?? menuItem.price
    form.setValue('amount', defaultPrice)
  }

  async function onSubmit(values: ItemEntryFormValues) {
    await createEntry.mutateAsync({
      salesId,
      menuItemId: values.menuItemId || undefined,
      itemName: values.itemName,
      categoryName: values.categoryName || undefined,
      quantity: Number(values.quantity),
      amount: Number(values.amount),
      posQuantityPercent: values.posQuantityPercent ? Number(values.posQuantityPercent) : undefined,
      posSalesPercent: values.posSalesPercent ? Number(values.posSalesPercent) : undefined,
    })
    form.reset(defaultItemEntryValues)
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
                {(entry.posQuantityPercent || entry.posSalesPercent) && (
                  <span className='text-muted-foreground'>
                    {' '}
                    &middot; POS {entry.posQuantityPercent ? `${entry.posQuantityPercent}% qty` : ''}
                    {entry.posQuantityPercent && entry.posSalesPercent ? ', ' : ''}
                    {entry.posSalesPercent ? `${entry.posSalesPercent}% sales` : ''}
                  </span>
                )}
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
          <div className='flex flex-wrap items-end gap-2'>
            <div className='w-40 space-y-1'>
              <Select value={selectedChannelId || UNFILTERED} onValueChange={(v) => setSelectedChannelId(v === UNFILTERED ? '' : v)}>
                <SelectTrigger aria-label='Sales channel (optional)'>
                  <SelectValue placeholder='Channel (optional)' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNFILTERED}>Any channel</SelectItem>
                  {(salesChannels ?? []).map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='w-40 space-y-1'>
              <Select value={selectedCategoryId || UNFILTERED} onValueChange={selectCategory}>
                <SelectTrigger aria-label='Category'>
                  <SelectValue placeholder='Category' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNFILTERED}>All Categories</SelectItem>
                  {(categories ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='w-48 space-y-1'>
              <Select value={form.watch('menuItemId') || ''} onValueChange={selectMenuItem}>
                <SelectTrigger aria-label='Menu item (optional)'>
                  <SelectValue placeholder='Menu item (optional)' />
                </SelectTrigger>
                <SelectContent>
                  {filteredMenuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='flex flex-wrap items-end gap-2'>
            <FormField
              control={form.control}
              name='itemName'
              render={({ field }) => (
                <FormItem className='w-40'>
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

            <FormField
              control={form.control}
              name='posQuantityPercent'
              render={({ field }) => (
                <FormItem className='w-24'>
                  <FormControl>
                    <Input inputMode='decimal' placeholder='POS % Qty' aria-label='POS % Qty' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='posSalesPercent'
              render={({ field }) => (
                <FormItem className='w-24'>
                  <FormControl>
                    <Input inputMode='decimal' placeholder='POS % Sales' aria-label='POS % Sales' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type='submit' size='icon' aria-label='Add item entry' disabled={createEntry.isPending}>
              <Plus className='h-4 w-4' />
            </Button>
          </div>

          <p className='text-xs text-muted-foreground'>
            POS % Qty and POS % Sales are values reported by the POS itself — not this system&rsquo;s computed
            analytics. Both are optional.
          </p>
        </form>
      </Form>
    </div>
  )
}
