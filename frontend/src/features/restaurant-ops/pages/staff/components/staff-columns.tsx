import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import type { RestaurantSummary } from '@/features/organizations/api/organizations-api'
import { tenantRoleLabel } from '../../../lib/tenant-role-labels'
import type { StaffMember } from '../../../types/restaurant-ops'
import { StaffActions } from './staff-actions'

// A function, not a static array — actions need organizationId/restaurants
// in scope. Same pattern as menu-item-columns.tsx's getMenuItemColumns.
export function getStaffColumns(
  organizationId: string,
  restaurants: RestaurantSummary[]
): ColumnDef<StaffMember>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Name' />,
      cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Email' />,
      cell: ({ row }) => <span className='text-muted-foreground'>{row.original.email}</span>,
    },
    {
      id: 'grants',
      header: 'Access',
      enableSorting: false,
      cell: ({ row }) => (
        <div className='flex flex-wrap gap-1'>
          {row.original.grants.map((grant) => (
            <Badge key={`${grant.scope}-${grant.scopeId}`} variant='secondary'>
              {grant.scopeName}: {tenantRoleLabel(grant.role)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <StaffActions member={row.original} organizationId={organizationId} restaurants={restaurants} />
      ),
    },
  ]
}
