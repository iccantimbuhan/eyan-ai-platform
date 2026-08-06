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
import { RecipeIngredientsDialog } from './recipe-ingredients-dialog'

type RecipeActionsProps = {
  recipe: Recipe
  menuItemName?: string
  availableMenuItems: MenuItem[]
}

export function RecipeActions({ recipe, menuItemName, availableMenuItems }: RecipeActionsProps) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={() => setIngredientsOpen(true)}>
            Manage Ingredients
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit Notes</DropdownMenuItem>

          <DropdownMenuItem className='text-destructive' onClick={() => setDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RecipeIngredientsDialog
        recipe={recipe}
        restaurantId={recipe.restaurantId}
        menuItemName={menuItemName}
        open={ingredientsOpen}
        onOpenChange={setIngredientsOpen}
      />

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
