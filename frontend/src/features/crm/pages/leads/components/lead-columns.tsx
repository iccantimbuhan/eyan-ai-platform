import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import {
  priorityBadgeVariant,
  priorityLabel,
  statusBadgeVariant,
  statusLabel,
} from '../../../lib/lead-lifecycle'
import type { Lead } from '../../../types/crm'
import { LeadActions } from './lead-actions'

export const leadColumns: ColumnDef<Lead>[] = [
  {
    accessorKey: 'contactName',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Name' />,
    cell: ({ row }) => (
      <div>
        <p className='font-medium'>{row.original.contactName}</p>
        <p className='text-xs text-muted-foreground'>{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: 'company',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Company' />,
    cell: ({ row }) => row.original.company || '—',
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
    cell: ({ row }) => (
      <Badge variant={statusBadgeVariant(row.original.status)}>
        {statusLabel(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorKey: 'priority',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Priority' />,
    cell: ({ row }) =>
      row.original.priority ? (
        <Badge variant={priorityBadgeVariant(row.original.priority)}>
          {priorityLabel(row.original.priority)}
        </Badge>
      ) : (
        <span className='text-muted-foreground'>—</span>
      ),
  },
  {
    accessorKey: 'score',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Score' />,
    cell: ({ row }) => (
      <div className='text-right font-medium'>{row.original.score ?? '—'}</div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Created' />,
    cell: ({ row }) => format(new Date(row.original.createdAt), 'MMM dd, yyyy'),
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <LeadActions lead={row.original} />,
  },
]
