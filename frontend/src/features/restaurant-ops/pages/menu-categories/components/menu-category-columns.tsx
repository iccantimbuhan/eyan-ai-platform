import { type ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import type { MenuCategory } from '../../../types/restaurant-ops'
import { MenuCategoryActions } from './menu-category-actions'

export const menuCategoryColumns: ColumnDef<MenuCategory>[] = [
  {
    accessorKey: 'displayOrder',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Order' />,
    cell: ({ row }) => <span className='text-muted-foreground'>{row.original.displayOrder}</span>,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Name' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <MenuCategoryActions category={row.original} />,
  },
]
