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
import { useCreateCapability, useUpdateCapability } from '../hooks/use-capabilities'
import { capabilitySchema, defaultCapabilityValues, type CapabilityFormValues } from '../schemas/capability-schema'
import type { AiCapability } from '../types/ai-core'

type Props = { open: boolean; onOpenChange: (open: boolean) => void; capability?: AiCapability | null }

// Key is create-only — Capabilities are additive-key resources (TDD §5).
// Everything else (name, description, brainId, isEnabled) is editable.
export function CapabilityDialog({ open, onOpenChange, capability = null }: Props) {
  const isEdit = capability !== null
  const { data: brains = [] } = useBrains()
  const create = useCreateCapability()
  const update = useUpdateCapability()
  const isPending = create.isPending || update.isPending

  const form = useForm<CapabilityFormValues>({
    resolver: zodResolver(capabilitySchema),
    defaultValues: defaultCapabilityValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      capability
        ? {
            key: capability.key,
            name: capability.name,
            description: capability.description,
            brainId: capability.brainId,
            isEnabled: capability.isEnabled,
          }
        : defaultCapabilityValues
    )
  }, [form, open, capability])

  async function submit(values: CapabilityFormValues) {
    if (isEdit && capability) {
      await update.mutateAsync({
        id: capability.id,
        payload: {
          name: values.name,
          description: values.description,
          brainId: values.brainId,
          isEnabled: values.isEnabled,
        },
      })
    } else {
      await create.mutateAsync(values)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Capability' : 'New Capability'}</DialogTitle>
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
                    <Input placeholder='e.g. lead-qualification' {...field} disabled={isEdit} />
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
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
