import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
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
import type { MenuItem, Recipe } from '../../../types/restaurant-ops'
import { getRecipeColumns } from './recipe-columns'
import { RecipeIngredientsDialog } from './recipe-ingredients-dialog'

type RecipeTableProps = {
  recipes: Recipe[]
  menuItems: MenuItem[]
  availableMenuItems: MenuItem[]
}

export function RecipeTable({ recipes, menuItems, availableMenuItems }: RecipeTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  // Owned here, not per-row — the row's clickable menu-item name and its
  // "Manage Ingredients" dropdown item both open this one shared dialog
  // instance instead of each having their own. Stored as an id (not the
  // Recipe object itself) so the dialog always reflects the live recipe —
  // adding/removing a line invalidates and refetches `recipes`, and a
  // captured object reference would go stale until the dialog reopened.
  const [manageIngredientsId, setManageIngredientsId] = React.useState<string | null>(null)
  const manageIngredientsRecipe = recipes.find((recipe) => recipe.id === manageIngredientsId)
  const menuItemNameById = React.useMemo(() => new Map(menuItems.map((item) => [item.id, item.name])), [menuItems])

  const columns = React.useMemo(
    () => getRecipeColumns(menuItems, availableMenuItems, (recipe) => setManageIngredientsId(recipe.id)),
    [menuItems, availableMenuItems]
  )

  const table = useReactTable({
    data: recipes,
    columns,

    state: { sorting, columnFilters },

    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),

    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className='space-y-4'>
      <DataTableToolbar table={table} searchPlaceholder='Search recipes...' searchKey='menuItem' />

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
                  No recipes yet. Add your first recipe to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />

      <RecipeIngredientsDialog
        recipe={manageIngredientsRecipe}
        restaurantId={manageIngredientsRecipe?.restaurantId ?? ''}
        menuItemName={manageIngredientsRecipe ? menuItemNameById.get(manageIngredientsRecipe.menuItemId) : undefined}
        open={manageIngredientsId !== null}
        onOpenChange={(open) => !open && setManageIngredientsId(null)}
      />
    </div>
  )
}
