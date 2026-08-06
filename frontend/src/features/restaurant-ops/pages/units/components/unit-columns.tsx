import { type ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import type { Unit } from '../../../types/restaurant-ops'
import { UnitActions } from './unit-actions'

export const unitColumns: ColumnDef<Unit>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Name' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
  },
  {
    accessorKey: 'abbreviation',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Abbreviation' />,
    cell: ({ row }) => (
      <span className='text-muted-foreground'>{row.original.abbreviation}</span>
    ),
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <UnitActions unit={row.original} />,
  },
]
