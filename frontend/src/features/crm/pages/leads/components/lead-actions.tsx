import { useNavigate } from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Lead } from '../../../types/crm'

type LeadActionsProps = {
  lead: Lead
}

export function LeadActions({ lead }: LeadActionsProps) {
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon'>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end'>
        <DropdownMenuItem
          onClick={() => navigate({ to: '/app/crm/leads/$leadId', params: { leadId: lead.id } })}
        >
          View Lead
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
