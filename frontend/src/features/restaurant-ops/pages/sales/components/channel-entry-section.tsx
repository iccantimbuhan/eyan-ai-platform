import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreatePosSource, useCreateSalesChannel, usePosSources, useSalesChannels } from '../../../hooks/use-sales-reference'
import { useCreateChannelEntry, useDeleteChannelEntry } from '../../../hooks/use-sales'
import {
  channelEntrySchema,
  defaultChannelEntryValues,
  type ChannelEntryFormValues,
} from '../../../schemas/sales-schema'
import type { SalesChannelEntry } from '../../../types/restaurant-ops'

type ChannelEntrySectionProps = {
  restaurantId: string
  salesId: string
  entries: SalesChannelEntry[]
}

const NO_POS_SOURCE = '__none__'

// Mirrors RecipeIngredientsDialog's "small add-line form + list-with-
// delete-button" pattern, reused for each of the four Sales line types.
// POS Source is optional here (POS Source / Sales Channel Flexibility) —
// a restaurant running a single POS never needs to touch it; one entering
// a two-terminal day (POS 1 = MyPOS, POS 2 = Wolt+Bolt) can tag each line
// with the terminal that reported it, purely per-entry, never a fixed
// channel-to-POS mapping.
export function ChannelEntrySection({ restaurantId, salesId, entries }: ChannelEntrySectionProps) {
  const { data: channels } = useSalesChannels(restaurantId)
  const { data: posSources } = usePosSources(restaurantId)
  const createChannel = useCreateSalesChannel(restaurantId)
  const createPosSource = useCreatePosSource(restaurantId)
  const createEntry = useCreateChannelEntry()
  const deleteEntry = useDeleteChannelEntry()
  const [newChannelName, setNewChannelName] = useState('')
  const [newPosSourceName, setNewPosSourceName] = useState('')

  const form = useForm<ChannelEntryFormValues>({
    resolver: zodResolver(channelEntrySchema),
    defaultValues: defaultChannelEntryValues,
  })

  useEffect(() => {
    form.reset(defaultChannelEntryValues)
  }, [salesId, form])

  async function onSubmit(values: ChannelEntryFormValues) {
    await createEntry.mutateAsync({
      salesId,
      salesChannelId: values.salesChannelId,
      amount: Number(values.amount),
      posSourceId: values.posSourceId && values.posSourceId !== NO_POS_SOURCE ? values.posSourceId : undefined,
      transactionCount: values.transactionCount ? Number(values.transactionCount) : undefined,
    })
    form.reset(defaultChannelEntryValues)
  }

  async function addNewChannel() {
    if (!newChannelName.trim()) return
    const channel = await createChannel.mutateAsync(newChannelName.trim())
    form.setValue('salesChannelId', channel.id)
    setNewChannelName('')
  }

  async function addNewPosSource() {
    if (!newPosSourceName.trim()) return
    const posSource = await createPosSource.mutateAsync(newPosSourceName.trim())
    form.setValue('posSourceId', posSource.id)
    setNewPosSourceName('')
  }

  return (
    <div className='space-y-3'>
      <p className='text-sm font-medium'>Sales Channels</p>

      <div className='space-y-2'>
        {entries.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No channel entries yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className='flex items-center justify-between rounded-md border px-3 py-2'>
              <span className='text-sm'>
                {entry.channelName}: &euro;{entry.amount}
                {entry.posSourceName ? ` (${entry.posSourceName})` : ''}
                {entry.transactionCount !== null ? ` (${entry.transactionCount} tx)` : ''}
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
        <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-wrap items-end gap-2'>
          <FormField
            control={form.control}
            name='salesChannelId'
            render={({ field }) => (
              <FormItem className='min-w-[140px] flex-1'>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label='Channel'>
                      <SelectValue placeholder='Channel' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(channels ?? []).map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
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
            name='posSourceId'
            render={({ field }) => (
              <FormItem className='w-36'>
                <Select value={field.value || NO_POS_SOURCE} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label='POS source'>
                      <SelectValue placeholder='POS (optional)' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_POS_SOURCE}>No POS source</SelectItem>
                    {(posSources ?? []).map((posSource) => (
                      <SelectItem key={posSource.id} value={posSource.id}>
                        {posSource.name}
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
            name='transactionCount'
            render={({ field }) => (
              <FormItem className='w-20'>
                <FormControl>
                  <Input inputMode='numeric' placeholder='Tx #' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' size='icon' aria-label='Add channel entry' disabled={createEntry.isPending}>
            <Plus className='h-4 w-4' />
          </Button>
        </form>
      </Form>

      <div className='flex flex-wrap items-end gap-2'>
        <Input
          placeholder='New channel name (e.g. Wolt)'
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          className='min-w-[160px] flex-1'
        />
        <Button type='button' variant='outline' size='sm' onClick={addNewChannel} disabled={createChannel.isPending}>
          Add Channel
        </Button>
        <Input
          placeholder='New POS source (e.g. POS 1)'
          value={newPosSourceName}
          onChange={(e) => setNewPosSourceName(e.target.value)}
          className='min-w-[160px] flex-1'
        />
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={addNewPosSource}
          disabled={createPosSource.isPending}
        >
          Add POS Source
        </Button>
      </div>
    </div>
  )
}
