import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateSalesChannel, useSalesChannels } from '../../../hooks/use-sales-reference'
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

// Mirrors RecipeIngredientsDialog's "small add-line form + list-with-
// delete-button" pattern, reused for each of the four Sales line types.
export function ChannelEntrySection({ restaurantId, salesId, entries }: ChannelEntrySectionProps) {
  const { data: channels } = useSalesChannels(restaurantId)
  const createChannel = useCreateSalesChannel(restaurantId)
  const createEntry = useCreateChannelEntry()
  const deleteEntry = useDeleteChannelEntry()
  const [newChannelName, setNewChannelName] = useState('')

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
    })
    form.reset(defaultChannelEntryValues)
  }

  async function addNewChannel() {
    if (!newChannelName.trim()) return
    const channel = await createChannel.mutateAsync(newChannelName.trim())
    form.setValue('salesChannelId', channel.id)
    setNewChannelName('')
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
        <form onSubmit={form.handleSubmit(onSubmit)} className='flex items-end gap-2'>
          <FormField
            control={form.control}
            name='salesChannelId'
            render={({ field }) => (
              <FormItem className='flex-1'>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
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
            name='amount'
            render={({ field }) => (
              <FormItem className='w-28'>
                <FormControl>
                  <Input inputMode='decimal' placeholder='Amount' {...field} />
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

      <div className='flex items-end gap-2'>
        <Input
          placeholder='New channel name (e.g. Wolt)'
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          className='flex-1'
        />
        <Button type='button' variant='outline' size='sm' onClick={addNewChannel} disabled={createChannel.isPending}>
          Add Channel
        </Button>
      </div>
    </div>
  )
}
