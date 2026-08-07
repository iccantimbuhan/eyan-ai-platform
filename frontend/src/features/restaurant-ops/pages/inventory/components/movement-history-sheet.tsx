import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useStockMovements } from '../../../hooks/use-inventory'
import type { InventoryItem, StockMovementType } from '../../../types/restaurant-ops'

type MovementHistorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem
}

const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  OPENING_STOCK: 'Opening Stock',
  ADJUSTMENT: 'Adjustment',
  WASTE: 'Waste',
  STOCK_COUNT: 'Stock Count',
}

export function MovementHistorySheet({ open, onOpenChange, item }: MovementHistorySheetProps) {
  const { data: movements, isLoading } = useStockMovements(open ? item.id : '')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full gap-0 overflow-y-auto sm:max-w-md'>
        <SheetHeader>
          <SheetTitle>Stock History</SheetTitle>
          <SheetDescription>{item.ingredientName}</SheetDescription>
        </SheetHeader>

        <div className='space-y-3 px-4 pb-4'>
          {isLoading ? (
            <p className='text-sm text-muted-foreground'>Loading history...</p>
          ) : (movements ?? []).length === 0 ? (
            <p className='text-sm text-muted-foreground'>No movements recorded yet.</p>
          ) : (
            (movements ?? []).map((movement) => (
              <div key={movement.id} className='space-y-1 rounded-md border p-3'>
                <div className='flex items-center justify-between'>
                  <Badge variant='outline'>{MOVEMENT_TYPE_LABELS[movement.type]}</Badge>
                  <span
                    className={
                      Number(movement.quantityDelta) < 0 ? 'text-destructive' : 'text-green-700 dark:text-green-400'
                    }
                  >
                    {Number(movement.quantityDelta) > 0 ? '+' : ''}
                    {movement.quantityDelta} {movement.unitAbbreviation}
                  </span>
                </div>

                <p className='text-sm text-muted-foreground'>
                  Balance after: {movement.quantityAfter} {movement.unitAbbreviation}
                </p>

                {movement.reason && <p className='text-sm'>{movement.reason}</p>}

                <p className='text-xs text-muted-foreground'>
                  {movement.createdByName} &middot; {new Date(movement.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
