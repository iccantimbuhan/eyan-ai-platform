import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { stockStatusBadgeClassName, stockStatusLabel } from '../../../lib/status-labels'
import type { InventoryItem } from '../../../types/restaurant-ops'
import { InventoryActions } from './inventory-actions'

// A function, not a static array — canWrite is display-only role context
// resolved on the page (mirrors getIngredientColumns needing the current
// restaurant's category list in scope).
export function getInventoryColumns(canWrite: boolean): ColumnDef<InventoryItem>[] {
  return [
    {
      accessorKey: 'ingredientName',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Ingredient' />,
      cell: ({ row }) => <span className='font-medium'>{row.original.ingredientName}</span>,
    },
    {
      accessorKey: 'currentQuantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Current' />,
      cell: ({ row }) => row.original.currentQuantity,
    },
    {
      accessorKey: 'unitAbbreviation',
      header: 'Unit',
      enableSorting: false,
      cell: ({ row }) => row.original.unitAbbreviation,
    },
    {
      accessorKey: 'minimumQuantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Minimum' />,
      cell: ({ row }) => row.original.minimumQuantity,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'OUT_OF_STOCK' ? 'destructive' : 'outline'}
          className={stockStatusBadgeClassName(row.original.status)}
        >
          {stockStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <InventoryActions item={row.original} canWrite={canWrite} />,
    },
  ]
}
