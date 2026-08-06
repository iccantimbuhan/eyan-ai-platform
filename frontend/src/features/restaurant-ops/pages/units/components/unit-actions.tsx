import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Unit } from '../../../types/restaurant-ops'
import { DeleteUnitDialog } from './delete-unit-dialog'
import { UnitDialog } from './unit-dialog'

type UnitActionsProps = {
  unit: Unit
}

export function UnitActions({ unit }: UnitActionsProps) {
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

      <UnitDialog
        unit={unit}
        restaurantId={unit.restaurantId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteUnitDialog unitId={unit.id} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}
