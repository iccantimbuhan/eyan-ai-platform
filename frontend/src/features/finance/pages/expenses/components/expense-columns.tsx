import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { categoryLabel, paymentMethodLabel } from '../../../lib/category-labels'
import { formatCurrency } from '../../../lib/format-currency'
import type { Expense } from '../../../types/finance'
import { ExpenseActions } from './expense-actions'

export const expenseColumns: ColumnDef<Expense>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Date' />,
    cell: ({ row }) => format(new Date(row.original.date), 'MMM dd, yyyy'),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Description' />,
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <span className='font-medium'>{row.original.description || '—'}</span>
        {row.original.isRecurring && (
          <Badge variant='outline' className='text-xs'>
            Recurring
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Category' />,
    cell: ({ row }) => <Badge variant='secondary'>{categoryLabel(row.original.category)}</Badge>,
  },
  {
    accessorKey: 'paymentMethod',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Payment Method' />,
    enableSorting: false,
    cell: ({ row }) => (
      <span className='text-muted-foreground'>
        {paymentMethodLabel(row.original.paymentMethod)}
      </span>
    ),
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Amount' />,
    cell: ({ row }) => (
      <div className='text-right font-medium'>{formatCurrency(row.original.amount)}</div>
    ),
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <ExpenseActions expense={row.original} />,
  },
]
