import * as React from 'react'
import { format } from 'date-fns'
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTablePagination } from '@/components/data-table/pagination'
import { DataTableToolbar } from '@/components/data-table/toolbar'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Role } from '../types/role'
import { RoleActions } from './role-actions'
const columns: ColumnDef<Role>[] = [
  { accessorKey: 'name', header: ({ column }) => <DataTableColumnHeader column={column} title="Role Name" />, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: 'description', header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />, cell: ({ row }) => <span className="max-w-72 truncate text-muted-foreground">{row.original.description || '—'}</span> },
  { accessorKey: 'userCount', header: ({ column }) => <DataTableColumnHeader column={column} title="Users" />, cell: ({ row }) => row.original.userCount },
  { accessorKey: 'isActive', header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />, cell: ({ row }) => row.original.isActive ? <Badge>Active</Badge> : <Badge variant="destructive">Inactive</Badge> },
  { accessorKey: 'createdAt', header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />, cell: ({ row }) => format(new Date(row.original.createdAt), 'MMM dd, yyyy') },
  { id: 'actions', enableSorting: false, enableHiding: false, cell: ({ row }) => <RoleActions role={row.original} /> },
]
export function RolesTable({ roles }: { roles: Role[] }) { const [sorting, setSorting] = React.useState<SortingState>([]); const [globalFilter, setGlobalFilter] = React.useState(''); const table = useReactTable({ data: roles, columns, state: { sorting, globalFilter }, onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 10 } } }); return <div className="space-y-4"><DataTableToolbar table={table} searchPlaceholder="Search roles..." searchKey="name" /><div className="rounded-lg border"><Table><TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No roles found.</TableCell></TableRow>}</TableBody></Table></div><DataTablePagination table={table} /></div> }
