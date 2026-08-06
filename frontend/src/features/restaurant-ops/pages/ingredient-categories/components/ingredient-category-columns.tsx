import { type ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import type { IngredientCategory } from '../../../types/restaurant-ops'
import { IngredientCategoryActions } from './ingredient-category-actions'

export const ingredientCategoryColumns: ColumnDef<IngredientCategory>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Name' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <IngredientCategoryActions category={row.original} />,
  },
]
