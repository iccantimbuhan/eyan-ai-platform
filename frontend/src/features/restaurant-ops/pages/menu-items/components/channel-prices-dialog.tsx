import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  useDeleteSalesChannelMenuItem,
  useSalesChannelMenuItems,
  useSalesChannels,
  useUpsertSalesChannelMenuItem,
} from '../../../hooks/use-sales-reference'
import type { MenuItem, SalesChannelMenuItem, SalesReference } from '../../../types/restaurant-ops'

type ChannelPricesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  item: MenuItem
}

type RowState = { price: string; available: boolean }

function buildInitialRows(channels: SalesReference[], overridesForItem: SalesChannelMenuItem[]) {
  const rows: Record<string, RowState> = {}
  for (const channel of channels) {
    const existing = overridesForItem.find((o) => o.salesChannelId === channel.id)
    rows[channel.id] = { price: existing?.price ?? '', available: existing?.available ?? true }
  }
  return rows
}

// Sprint 2B Prep — one optional price/availability override per Sales
// Channel for this Menu Item. MenuItem.price (the base price shown above
// the list) is never overwritten here; a blank Price field means "use the
// base price on this channel." Mirrors RecipeIngredientsDialog's shape
// (header = the item, list of editable lines) but each line already
// exists for every channel — there's nothing to "add," only to set, clear,
// or toggle availability.
export function ChannelPricesDialog({ open, onOpenChange, restaurantId, item }: ChannelPricesDialogProps) {
  const { data: channels } = useSalesChannels(restaurantId)
  const { data: overrides } = useSalesChannelMenuItems(restaurantId)

  const overridesForItem = (overrides ?? []).filter((o) => o.menuItemId === item.id)
  const dataReady = channels !== undefined && overrides !== undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Channel Prices &mdash; {item.name}</DialogTitle>
          <DialogDescription>
            Base price: &euro;{item.price}. Set a different price per sales channel, or leave a channel blank to
            use the base price. This never changes the base price above.
          </DialogDescription>
        </DialogHeader>

        {/* Keyed by whether the dialog is open and whether data has
            finished loading — this remounts the row editor (and its local
            `rows` state) fresh exactly when it should reflect current
            server values: on every open, and once loading completes.
            Avoids syncing state via a setState-in-effect, which reintroduces
            re-render cascades for no benefit here — the values only need to
            be correct at mount time, then are freely editable locally. */}
        <ChannelPriceRows
          key={`${item.id}-${open}-${dataReady}`}
          menuItemId={item.id}
          basePrice={item.price}
          channels={channels ?? []}
          overridesForItem={overridesForItem}
        />

        <div className='flex justify-end'>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ChannelPriceRowsProps = {
  menuItemId: string
  basePrice: string
  channels: SalesReference[]
  overridesForItem: SalesChannelMenuItem[]
}

function ChannelPriceRows({ menuItemId, basePrice, channels, overridesForItem }: ChannelPriceRowsProps) {
  const upsert = useUpsertSalesChannelMenuItem()
  const remove = useDeleteSalesChannelMenuItem()
  const [rows, setRows] = useState<Record<string, RowState>>(() => buildInitialRows(channels, overridesForItem))

  function updateRow(channelId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [channelId]: { ...prev[channelId], ...patch } }))
  }

  async function saveRow(channelId: string) {
    const row = rows[channelId]
    await upsert.mutateAsync({
      menuItemId,
      salesChannelId: channelId,
      payload: { price: row.price === '' ? null : Number(row.price), available: row.available },
    })
  }

  async function clearRow(channelId: string) {
    await remove.mutateAsync({ menuItemId, salesChannelId: channelId })
    updateRow(channelId, { price: '', available: true })
  }

  if (channels.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>No sales channels yet — add one from a Daily Sales entry first.</p>
    )
  }

  return (
    <div className='space-y-2'>
      {channels.map((channel) => {
        const row = rows[channel.id] ?? { price: '', available: true }
        const hasOverride = overridesForItem.some((o) => o.salesChannelId === channel.id)

        return (
          <div key={channel.id} className='flex items-center gap-2 rounded-md border px-3 py-2'>
            <span className='w-24 shrink-0 text-sm font-medium'>{channel.name}</span>

            <Input
              inputMode='decimal'
              placeholder={`Base (€${basePrice})`}
              aria-label={`${channel.name} price`}
              value={row.price}
              onChange={(e) => updateRow(channel.id, { price: e.target.value })}
              className='w-32'
            />

            <div className='flex items-center gap-1.5'>
              <Switch
                checked={row.available}
                onCheckedChange={(checked) => updateRow(channel.id, { available: checked })}
                aria-label={`${channel.name} available`}
              />
              <span className='text-xs text-muted-foreground'>Available</span>
            </div>

            <div className='ms-auto flex gap-1'>
              {hasOverride && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  disabled={remove.isPending}
                  onClick={() => clearRow(channel.id)}
                >
                  Clear
                </Button>
              )}
              <Button type='button' size='sm' disabled={upsert.isPending} onClick={() => saveRow(channel.id)}>
                Save
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
