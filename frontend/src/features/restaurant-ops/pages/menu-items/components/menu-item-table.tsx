import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table/pagination'
import { DataTableToolbar } from '@/components/data-table/toolbar'
import { MENU_ITEM_STATUS_OPTIONS } from '../../../lib/status-labels'
import type { MenuCategory, MenuItem } from '../../../types/restaurant-ops'
import { getMenuItemColumns } from './menu-item-columns'

type MenuItemTableProps = {
  items: MenuItem[]
  categories: MenuCategory[]
}

export function MenuItemTable({ items, categories }: MenuItemTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const columns = React.useMemo(() => getMenuItemColumns(categories), [categories])

  // Category filter options come from the categories already fetched for
  // this restaurant (same list the table's 'category' column resolves
  // names from) — no separate/duplicated category data source.
  const categoryFilterOptions = React.useMemo(
    () => categories.map((category) => ({ label: category.name, value: category.name })),
    [categories]
  )

  const table = useReactTable({
    data: items,
    columns,

    state: { sorting, columnFilters },

    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),

    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className='space-y-4'>
      <DataTableToolbar
        table={table}
        searchPlaceholder='Search menu items...'
        searchKey='name'
        filters={[
          {
            columnId: 'category',
            title: 'Category',
            options: categoryFilterOptions,
          },
          {
            columnId: 'status',
            title: 'Status',
            options: MENU_ITEM_STATUS_OPTIONS,
          },
        ]}
      />

      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  {table.getState().columnFilters.length > 0 || table.getState().globalFilter
                    ? 'No menu items match your filters.'
                    : 'No menu items yet. Add your first item to get started.'}
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
