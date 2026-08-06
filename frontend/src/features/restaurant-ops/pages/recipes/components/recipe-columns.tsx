import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import type { MenuItem, Recipe } from '../../../types/restaurant-ops'
import { RecipeActions } from './recipe-actions'

// A function, not a static array — Menu Item name is a display-only lookup
// (menu items aren't embedded on Recipe), so the column definitions need
// the current restaurant's menu item list in scope. Same pattern as
// menu-item-columns.tsx's getMenuItemColumns.
export function getRecipeColumns(
  menuItems: MenuItem[],
  availableMenuItems: MenuItem[]
): ColumnDef<Recipe>[] {
  const menuItemNameById = new Map(menuItems.map((item) => [item.id, item.name]))

  return [
    {
      id: 'menuItem',
      accessorFn: (row) => menuItemNameById.get(row.menuItemId) ?? '—',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Menu Item' />,
      cell: ({ row }) => (
        <span className='font-medium'>
          {menuItemNameById.get(row.original.menuItemId) ?? '—'}
        </span>
      ),
    },
    {
      id: 'ingredientCount',
      accessorFn: (row) => row.ingredients.length,
      header: ({ column }) => <DataTableColumnHeader column={column} title='Ingredients' />,
      cell: ({ row }) => <Badge variant='secondary'>{row.original.ingredients.length}</Badge>,
    },
    {
      accessorKey: 'notes',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Notes' />,
      cell: ({ row }) => (
        <span className='text-muted-foreground'>{row.original.notes ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <RecipeActions
          recipe={row.original}
          menuItemName={menuItemNameById.get(row.original.menuItemId)}
          availableMenuItems={availableMenuItems}
        />
      ),
    },
  ]
}
