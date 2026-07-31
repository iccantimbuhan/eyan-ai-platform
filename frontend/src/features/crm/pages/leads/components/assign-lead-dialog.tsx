import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUsers } from '@/features/users/hooks/use-users'
import { useAssignLead } from '../../../hooks/use-leads'
import {
  leadAssignSchema,
  UNASSIGNED_VALUE,
  type LeadAssignFormValues,
} from '../../../schemas/lead-schema'
import type { Lead } from '../../../types/crm'

type AssignLeadDialogProps = {
  lead: Lead
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignLeadDialog({ lead, open, onOpenChange }: AssignLeadDialogProps) {
  const { data: users } = useUsers()
  const assignLead = useAssignLead(lead.id)

  const form = useForm<LeadAssignFormValues>({
    resolver: zodResolver(leadAssignSchema),
    defaultValues: { assignedToId: lead.assignedToId ?? UNASSIGNED_VALUE },
  })

  useEffect(() => {
    if (open) {
      form.reset({ assignedToId: lead.assignedToId ?? UNASSIGNED_VALUE })
    }
  }, [form, open, lead.assignedToId])

  async function onSubmit(values: LeadAssignFormValues) {
    await assignLead.mutateAsync(
      values.assignedToId === UNASSIGNED_VALUE ? null : values.assignedToId
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Assign Lead</DialogTitle>
          <DialogDescription>Choose the sales rep responsible for this lead.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='assignedToId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sales Rep</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select a rep' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                      {(users ?? []).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={assignLead.isPending}>
                {assignLead.isPending ? 'Saving...' : 'Assign'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
