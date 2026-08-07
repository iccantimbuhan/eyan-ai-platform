import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import type { MenuItem, Recipe } from '../../../types/restaurant-ops'
import { RecipeActions } from './recipe-actions'

// A function, not a static array — Menu Item name is a display-only lookup
// (menu items aren't embedded on Recipe), so the column definitions need
// the current restaurant's menu item list in scope. Same pattern as
// menu-item-columns.tsx's getMenuItemColumns.
//
// onManageIngredients is owned one level up (recipe-table.tsx) and shared
// between this column's clickable menu-item name and RecipeActions' own
// "Manage Ingredients" item, so both trigger the exact same
// RecipeIngredientsDialog instance rather than two separate ones.
export function getRecipeColumns(
  menuItems: MenuItem[],
  availableMenuItems: MenuItem[],
  onManageIngredients: (recipe: Recipe) => void
): ColumnDef<Recipe>[] {
  const menuItemNameById = new Map(menuItems.map((item) => [item.id, item.name]))

  return [
    {
      id: 'menuItem',
      accessorFn: (row) => menuItemNameById.get(row.menuItemId) ?? '—',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Menu Item' />,
      cell: ({ row }) => (
        <button
          type='button'
          className='font-medium text-foreground underline-offset-4 hover:text-primary hover:underline'
          onClick={() => onManageIngredients(row.original)}
        >
          {menuItemNameById.get(row.original.menuItemId) ?? '—'}
        </button>
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
        <span className='text-muted-foreground'>{row.original.notes ?? 'No notes'}</span>
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
          onManageIngredients={() => onManageIngredients(row.original)}
        />
      ),
    },
  ]
}
