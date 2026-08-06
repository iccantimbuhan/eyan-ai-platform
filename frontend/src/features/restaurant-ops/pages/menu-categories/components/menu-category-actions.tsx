import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MenuCategory } from '../../../types/restaurant-ops'
import { DeleteMenuCategoryDialog } from './delete-menu-category-dialog'
import { MenuCategoryDialog } from './menu-category-dialog'

type MenuCategoryActionsProps = {
  category: MenuCategory
}

export function MenuCategoryActions({ category }: MenuCategoryActionsProps) {
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

      <MenuCategoryDialog
        category={category}
        restaurantId={category.restaurantId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteMenuCategoryDialog
        categoryId={category.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
