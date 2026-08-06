import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { menuItemStatusLabel } from '../../../lib/status-labels'
import type { MenuCategory, MenuItem } from '../../../types/restaurant-ops'
import { MenuItemActions } from './menu-item-actions'

// A function, not a static array — Category is a display-only lookup
// (categories aren't embedded on MenuItem), so the column definitions need
// the current restaurant's category list in scope. See menu-item-table.tsx.
export function getMenuItemColumns(categories: MenuCategory[]): ColumnDef<MenuItem>[] {
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Name' />,
      cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
    },
    {
      id: 'category',
      accessorFn: (row) => categoryNameById.get(row.menuCategoryId) ?? '—',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Category' />,
      cell: ({ row }) => (
        <Badge variant='secondary'>{categoryNameById.get(row.original.menuCategoryId) ?? '—'}</Badge>
      ),
    },
    {
      accessorKey: 'price',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Price' />,
      cell: ({ row }) => <div className='text-right font-medium'>{row.original.price}</div>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
      cell: ({ row }) => <Badge variant='outline'>{menuItemStatusLabel(row.original.status)}</Badge>,
    },
    {
      accessorKey: 'available',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Available' />,
      enableSorting: false,
      cell: ({ row }) =>
        row.original.available ? (
          <span className='text-emerald-600 dark:text-emerald-400'>Yes</span>
        ) : (
          <span className='text-muted-foreground'>No</span>
        ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <MenuItemActions item={row.original} categories={categories} />,
    },
  ]
}
