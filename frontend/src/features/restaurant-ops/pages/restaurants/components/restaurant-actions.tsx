import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Restaurant } from '../../../types/restaurant-ops'
import { DeleteRestaurantDialog } from './delete-restaurant-dialog'
import { RestaurantDialog } from './restaurant-dialog'

type RestaurantActionsProps = {
  restaurant: Restaurant
}

export function RestaurantActions({ restaurant }: RestaurantActionsProps) {
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

      <RestaurantDialog
        restaurant={restaurant}
        organizationId={restaurant.organizationId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteRestaurantDialog
        restaurantId={restaurant.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
