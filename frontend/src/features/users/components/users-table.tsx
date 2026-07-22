import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  type SortingState,
  type VisibilityState,
  type ColumnFiltersState,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { DataTableToolbar } from '@/components/data-table/toolbar'
import { DataTablePagination } from '@/components/data-table/pagination'

import type { User } from '../types/user'
import { usersColumns } from './users-columns'

type UsersTableProps = {
  users: User[]
}

export function UsersTable({ users }: UsersTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([])

  const [globalFilter, setGlobalFilter] = React.useState('')

  const table = useReactTable({
    data: users,
    columns: usersColumns,

    state: {
      sorting,
      columnVisibility,
      columnFilters,
      globalFilter,
    },

    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),

    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-4">

      <DataTableToolbar
        table={table}
        searchPlaceholder="Search users..."
        searchKey="name"
      />

      <div className="rounded-lg border">
        <Table>

          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>

                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>

                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}

                  </TableHead>
                ))}

              </TableRow>
            ))}
          </TableHeader>

          <TableBody>

            {table.getRowModel().rows.length ? (

              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >

                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>

                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}

                    </TableCell>
                  ))}

                </TableRow>
              ))

            ) : (

              <TableRow>

                <TableCell
                  colSpan={usersColumns.length}
                  className="h-24 text-center"
                >
                  No users found.
                </TableCell>

              </TableRow>

            )}

          </TableBody>

        </Table>
      </div>

      <DataTablePagination table={table} />

    </div>
  )
}
