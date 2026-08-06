import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MenuCategory, MenuItem } from '../../../types/restaurant-ops'
import { DeleteMenuItemDialog } from './delete-menu-item-dialog'
import { MenuItemDialog } from './menu-item-dialog'

type MenuItemActionsProps = {
  item: MenuItem
  categories: MenuCategory[]
}

export function MenuItemActions({ item, categories }: MenuItemActionsProps) {
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

      <MenuItemDialog
        item={item}
        restaurantId={item.restaurantId}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteMenuItemDialog itemId={item.id} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}
