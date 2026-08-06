import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import type { Ingredient, IngredientCategory } from '../../../types/restaurant-ops'
import { IngredientActions } from './ingredient-actions'

// A function, not a static array — Category is a display-only lookup
// (categories aren't embedded on Ingredient), so the column definitions
// need the current restaurant's category list in scope. Same pattern as
// menu-item-columns.tsx's getMenuItemColumns.
export function getIngredientColumns(categories: IngredientCategory[]): ColumnDef<Ingredient>[] {
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Name' />,
      cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
    },
    {
      id: 'category',
      accessorFn: (row) => categoryNameById.get(row.ingredientCategoryId ?? '') ?? '—',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Category' />,
      cell: ({ row }) => (
        <Badge variant='secondary'>
          {categoryNameById.get(row.original.ingredientCategoryId ?? '') ?? '—'}
        </Badge>
      ),
    },
    {
      id: 'suppliers',
      header: 'Suppliers',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.suppliers.length === 0 ? (
          <span className='text-muted-foreground'>—</span>
        ) : (
          <div className='flex flex-wrap gap-1'>
            {row.original.suppliers.map((supplier) => (
              <Badge key={supplier.id} variant='outline'>
                {supplier.name}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <IngredientActions ingredient={row.original} />,
    },
  ]
}
