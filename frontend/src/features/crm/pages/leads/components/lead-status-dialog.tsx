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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateLeadStatus } from '../../../hooks/use-leads'
import { getValidNextStatuses, statusLabel } from '../../../lib/lead-lifecycle'
import { leadStatusChangeSchema, type LeadStatusChangeFormValues } from '../../../schemas/lead-schema'
import type { Lead } from '../../../types/crm'

type LeadStatusDialogProps = {
  lead: Lead
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadStatusDialog({ lead, open, onOpenChange }: LeadStatusDialogProps) {
  const nextStatuses = getValidNextStatuses(lead.status)
  const updateStatus = useUpdateLeadStatus(lead.id)

  const form = useForm<LeadStatusChangeFormValues>({
    resolver: zodResolver(leadStatusChangeSchema),
    defaultValues: { status: nextStatuses[0] ?? '', lostReason: '' },
  })

  // Same reset-on-open idiom as automation's McpServerDialog — react-hook-form
  // owns the setState here, not a raw useState, so the dialog's fields start
  // fresh every time it opens without tripping react-hooks/set-state-in-effect.
  useEffect(() => {
    if (open) {
      form.reset({ status: nextStatuses[0] ?? '', lostReason: '' })
    }
    // nextStatuses is derived fresh from lead.status every render — depending
    // on lead.status directly (like McpServerDialog depends on `server`)
    // keeps this in sync without an extra, unstable array dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, open, lead.status])

  const status = form.watch('status')

  async function onSubmit(values: LeadStatusChangeFormValues) {
    await updateStatus.mutateAsync({
      status: values.status as Lead['status'],
      ...(values.status === 'LOST' ? { lostReason: values.lostReason || undefined } : {}),
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>
            Move this lead to its next stage. Only valid transitions are shown.
          </DialogDescription>
        </DialogHeader>

        {nextStatuses.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            {statusLabel(lead.status)} is a final status — this lead can no longer move.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select status' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {nextStatuses.map((option) => (
                          <SelectItem key={option} value={option}>
                            {statusLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {status === 'LOST' && (
                <FormField
                  control={form.control}
                  name='lostReason'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder='Why was this lead lost?' rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type='submit' disabled={updateStatus.isPending}>
                  {updateStatus.isPending ? 'Saving...' : 'Update Status'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
