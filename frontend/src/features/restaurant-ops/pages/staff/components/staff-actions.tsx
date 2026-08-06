import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RestaurantSummary } from '@/features/organizations/api/organizations-api'
import type { StaffMember } from '../../../types/restaurant-ops'
import { DisableStaffDialog } from './disable-staff-dialog'
import { StaffDialog } from './staff-dialog'

type StaffActionsProps = {
  member: StaffMember
  organizationId: string
  restaurants: RestaurantSummary[]
}

export function StaffActions({ member, organizationId, restaurants }: StaffActionsProps) {
  const [grantOpen, setGrantOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={() => setGrantOpen(true)}>
            Grant Additional Access
          </DropdownMenuItem>

          <DropdownMenuItem className='text-destructive' onClick={() => setDisableOpen(true)}>
            Disable
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StaffDialog
        organizationId={organizationId}
        restaurants={restaurants}
        prefillEmail={member.email}
        open={grantOpen}
        onOpenChange={setGrantOpen}
      />

      <DisableStaffDialog
        organizationId={organizationId}
        userId={member.userId}
        name={member.name}
        open={disableOpen}
        onOpenChange={setDisableOpen}
      />
    </>
  )
}
