import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { IngredientCategory } from '../../../types/restaurant-ops'
import { DeleteIngredientCategoryDialog } from './delete-ingredient-category-dialog'
import { IngredientCategoryDialog } from './ingredient-category-dialog'

type IngredientCategoryActionsProps = {
  category: IngredientCategory
}

export function IngredientCategoryActions({ category }: IngredientCategoryActionsProps) {
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

      <IngredientCategoryDialog
        category={category}
        restaurantId={category.restaurantId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteIngredientCategoryDialog
        categoryId={category.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
