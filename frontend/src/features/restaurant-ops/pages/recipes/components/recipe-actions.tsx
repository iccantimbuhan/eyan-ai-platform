import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MenuItem, Recipe } from '../../../types/restaurant-ops'
import { DeleteRecipeDialog } from './delete-recipe-dialog'
import { RecipeDialog } from './recipe-dialog'

type RecipeActionsProps = {
  recipe: Recipe
  menuItemName?: string
  availableMenuItems: MenuItem[]
  // Opens the same RecipeIngredientsDialog instance the row's clickable
  // menu-item name opens — owned one level up (recipe-table.tsx) so there
  // is exactly one dialog per row, not two separate implementations.
  onManageIngredients: () => void
}

export function RecipeActions({
  recipe,
  menuItemName,
  availableMenuItems,
  onManageIngredients,
}: RecipeActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' aria-label='Recipe actions'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={onManageIngredients}>Manage Ingredients</DropdownMenuItem>

          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit Notes</DropdownMenuItem>

          <DropdownMenuItem className='text-destructive' onClick={() => setDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RecipeDialog
        recipe={recipe}
        restaurantId={recipe.restaurantId}
        availableMenuItems={availableMenuItems}
        menuItemName={menuItemName}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteRecipeDialog recipeId={recipe.id} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}
