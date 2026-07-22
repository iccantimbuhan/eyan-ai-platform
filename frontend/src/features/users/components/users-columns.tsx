import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'

import { DataTableColumnHeader } from '@/components/data-table/column-header'

import { UserActions } from './user-actions'

import type { User } from '../types/user'

export const usersColumns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.name}
      </div>
    ),
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {row.original.email}
      </div>
    ),
  },
  {
    accessorKey: 'roles',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Roles" />
    ),
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.roles.map((role) => (
          <Badge
            key={role}
            variant="secondary"
          >
            {role}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge>Active</Badge>
      ) : (
        <Badge variant="destructive">
          Inactive
        </Badge>
      ),
  },
  {
    accessorKey: 'emailVerified',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Verified"
      />
    ),
    cell: ({ row }) =>
      row.original.emailVerified ? (
        <Badge>Verified</Badge>
      ) : (
        <Badge variant="outline">
          Pending
        </Badge>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Created"
      />
    ),
    cell: ({ row }) =>
      format(
        new Date(row.original.createdAt),
        'MMM dd, yyyy'
      ),
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <UserActions user={row.original} />
    ),
  },
]
