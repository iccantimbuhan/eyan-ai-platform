import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Ingredient } from '../../../types/restaurant-ops'
import { DeleteIngredientDialog } from './delete-ingredient-dialog'
import { IngredientDialog } from './ingredient-dialog'

type IngredientActionsProps = {
  ingredient: Ingredient
}

export function IngredientActions({ ingredient }: IngredientActionsProps) {
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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>

          <DropdownMenuItem className='text-destructive' onClick={() => setDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <IngredientDialog
        ingredient={ingredient}
        restaurantId={ingredient.restaurantId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteIngredientDialog
        ingredientId={ingredient.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
