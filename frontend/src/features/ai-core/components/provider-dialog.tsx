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
import { useProviderPlugins, useCreateProvider, useUpdateProvider } from '../hooks/use-providers'
import { defaultProviderValues, providerSchema, type ProviderFormValues } from '../schemas/provider-schema'
import type { AiProvider } from '../types/ai-core'

type Props = { open: boolean; onOpenChange: (open: boolean) => void; provider?: AiProvider | null }

export function ProviderDialog({ open, onOpenChange, provider = null }: Props) {
  const isEdit = provider !== null
  const { data: plugins = [] } = useProviderPlugins()
  const create = useCreateProvider()
  const update = useUpdateProvider()
  const isPending = create.isPending || update.isPending

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: defaultProviderValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      provider
        ? {
            key: provider.key,
            displayName: provider.displayName,
            kind: provider.kind,
            baseUrl: provider.baseUrl ?? '',
            isEnabled: provider.isEnabled,
          }
        : defaultProviderValues
    )
  }, [form, open, provider])

  async function submit(values: ProviderFormValues) {
    if (isEdit && provider) {
      await update.mutateAsync({
        id: provider.id,
        payload: { displayName: values.displayName, baseUrl: values.baseUrl || null, isEnabled: values.isEnabled },
      })
    } else {
      await create.mutateAsync({ ...values, baseUrl: values.baseUrl || undefined })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Provider' : 'New Provider'}</DialogTitle>
          <DialogDescription>
            The registry key must match a registered AiCoreProviderFactory plugin (see below).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='key'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registry Key</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select a registered plugin' />
                      </SelectTrigger>
                      <SelectContent>
                        {plugins.map((key) => (
                          <SelectItem key={key} value={key} className='capitalize'>
                            {key}
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
              name='displayName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Ollama (local)' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='kind'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kind</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='LOCAL'>LOCAL</SelectItem>
                        <SelectItem value='HOSTED'>HOSTED</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='baseUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL (LOCAL only)</FormLabel>
                  <FormControl>
                    <Input placeholder='http://host.docker.internal:11434' {...field} />
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
