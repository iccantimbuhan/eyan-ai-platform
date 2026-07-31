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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useBrains } from '../hooks/use-brains'
import { useCreateCapability } from '../hooks/use-capabilities'
import { capabilitySchema, defaultCapabilityValues, type CapabilityFormValues } from '../schemas/capability-schema'

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

// Only "create" — Capabilities are additive-key resources (TDD §5), and
// editing the brainId a Capability resolves to is an admin-level routing
// decision deferred to a later pass. Deleting is available from the list
// page.
export function CapabilityDialog({ open, onOpenChange }: Props) {
  const { data: brains = [] } = useBrains()
  const create = useCreateCapability()

  const form = useForm<CapabilityFormValues>({
    resolver: zodResolver(capabilitySchema),
    defaultValues: defaultCapabilityValues,
  })

  useEffect(() => {
    if (open) form.reset(defaultCapabilityValues)
  }, [form, open])

  async function submit(values: CapabilityFormValues) {
    await create.mutateAsync(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>New Capability</DialogTitle>
          <DialogDescription>
            A business task business modules invoke by key. Resolves to exactly one Brain.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='key'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. lead-qualification' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Lead Qualification' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='brainId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brain</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select a Brain' />
                      </SelectTrigger>
                      <SelectContent>
                        {brains.map((brain) => (
                          <SelectItem key={brain.id} value={brain.id}>
                            {brain.name} ({brain.key})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='isEnabled'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-md border px-4 py-3'>
                  <FormLabel>Enabled</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={create.isPending}>
                Cancel
              </Button>
              <Button type='submit' disabled={create.isPending}>
                {create.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
