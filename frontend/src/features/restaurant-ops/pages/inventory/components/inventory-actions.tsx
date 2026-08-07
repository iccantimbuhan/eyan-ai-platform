import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { InventoryItem } from '../../../types/restaurant-ops'
import { AdjustmentDialog } from './adjustment-dialog'
import { EditMinimumQuantityDialog } from './edit-minimum-quantity-dialog'
import { MovementHistorySheet } from './movement-history-sheet'
import { StockCountDialog } from './stock-count-dialog'
import { WasteDialog } from './waste-dialog'

type InventoryActionsProps = {
  item: InventoryItem
  canWrite: boolean
}

export function InventoryActions({ item, canWrite }: InventoryActionsProps) {
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [wasteOpen, setWasteOpen] = useState(false)
  const [stockCountOpen, setStockCountOpen] = useState(false)
  const [editMinimumOpen, setEditMinimumOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={() => setHistoryOpen(true)}>View History</DropdownMenuItem>

          {canWrite && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAdjustOpen(true)}>Adjust Stock</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setWasteOpen(true)}>Record Waste</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStockCountOpen(true)}>Stock Count</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditMinimumOpen(true)}>
                Edit Minimum Threshold
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <MovementHistorySheet open={historyOpen} onOpenChange={setHistoryOpen} item={item} />

      {canWrite && (
        <>
          <AdjustmentDialog open={adjustOpen} onOpenChange={setAdjustOpen} item={item} />
          <WasteDialog open={wasteOpen} onOpenChange={setWasteOpen} item={item} />
          <StockCountDialog open={stockCountOpen} onOpenChange={setStockCountOpen} item={item} />
          <EditMinimumQuantityDialog
            open={editMinimumOpen}
            onOpenChange={setEditMinimumOpen}
            item={item}
          />
        </>
      )}
    </>
  )
}
