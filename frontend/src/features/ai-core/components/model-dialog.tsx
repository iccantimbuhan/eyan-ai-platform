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
import { useProviders } from '../hooks/use-providers'
import { useCreateModel, useUpdateModel } from '../hooks/use-models'
import { defaultModelValues, modelSchema, parseTagsText, type ModelFormValues } from '../schemas/provider-schema'
import type { AiModel } from '../types/ai-core'

type Props = { open: boolean; onOpenChange: (open: boolean) => void; model?: AiModel | null }

export function ModelDialog({ open, onOpenChange, model = null }: Props) {
  const isEdit = model !== null
  const { data: providers = [] } = useProviders()
  const create = useCreateModel()
  const update = useUpdateModel()
  const isPending = create.isPending || update.isPending

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelSchema),
    defaultValues: defaultModelValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      model
        ? {
            providerId: model.providerId,
            modelKey: model.modelKey,
            displayName: model.displayName,
            tagsText: model.tags.join(', '),
            isEnabled: model.isEnabled,
          }
        : defaultModelValues
    )
  }, [form, open, model])

  async function submit(values: ModelFormValues) {
    if (isEdit && model) {
      await update.mutateAsync({
        id: model.id,
        payload: {
          displayName: values.displayName,
          tags: parseTagsText(values.tagsText),
          isEnabled: values.isEnabled,
        },
      })
    } else {
      await create.mutateAsync({
        providerId: values.providerId,
        modelKey: values.modelKey,
        displayName: values.displayName,
        tags: parseTagsText(values.tagsText),
        isEnabled: values.isEnabled,
      })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Model' : 'New Model'}</DialogTitle>
          <DialogDescription>Tags are technical abilities (e.g. "reasoning"), never a business Capability.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='providerId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select a provider' />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.displayName}
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
              name='modelKey'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Key</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. qwen2.5-coder:7b' {...field} disabled={isEdit} />
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
                    <Input placeholder='e.g. Qwen 2.5 Coder 7B' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='tagsText'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder='chat, coding, reasoning' {...field} />
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
