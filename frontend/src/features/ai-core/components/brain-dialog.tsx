import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useCreateBrain, useUpdateBrain } from '../hooks/use-brains'
import {
  brainSchema,
  defaultBrainValues,
  type BrainFormValues,
} from '../schemas/brain-schema'
import type { AiBrain } from '../types/ai-core'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  brain?: AiBrain | null
}

const MEMORY_STRATEGIES = [
  'NONE',
  'CONVERSATION',
  'KNOWLEDGE_BASE',
  'VECTOR',
  'RAG',
  'LONG_TERM',
] as const

export function BrainDialog({ open, onOpenChange, brain = null }: Props) {
  const isEdit = brain !== null
  const create = useCreateBrain()
  const update = useUpdateBrain()
  const isPending = create.isPending || update.isPending

  const form = useForm<BrainFormValues>({
    resolver: zodResolver(brainSchema),
    defaultValues: defaultBrainValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      brain
        ? {
            key: brain.key,
            name: brain.name,
            description: brain.description,
            category: brain.category,
            memoryStrategy: brain.memoryStrategy,
            isEnabled: brain.isEnabled,
          }
        : defaultBrainValues
    )
  }, [form, open, brain])

  async function submit(values: BrainFormValues) {
    if (isEdit && brain) {
      await update.mutateAsync({
        id: brain.id,
        payload: {
          name: values.name,
          description: values.description,
          category: values.category,
          memoryStrategy: values.memoryStrategy,
          isEnabled: values.isEnabled,
        },
      })
    } else {
      await create.mutateAsync(values)
    }
    onOpenChange(false)
  }

  const { guardedOnOpenChange, unsavedChangesDialogProps } =
    useUnsavedChangesGuard({
      isDirty: form.formState.isDirty,
      onOpenChange,
    })

  return (
    <>
      <Dialog open={open} onOpenChange={guardedOnOpenChange}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Brain' : 'New Brain'}</DialogTitle>
            <DialogDescription>
              A reusable AI configuration — provider, model, prompt, and routing
              policy are configured after creation.
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
                      <Input
                        placeholder='e.g. sales-brain'
                        {...field}
                        disabled={isEdit}
                      />
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
                      <Input placeholder='e.g. Sales Brain' {...field} />
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
              <div className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='category'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. Sales' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='memoryStrategy'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Memory Strategy</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEMORY_STRATEGIES.map((strategy) => (
                              <SelectItem key={strategy} value={strategy}>
                                {strategy}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name='isEnabled'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-md border px-4 py-3'>
                    <FormLabel>Enabled</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => guardedOnOpenChange(false)}
                  disabled={isPending}
                >
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
      <UnsavedChangesDialog {...unsavedChangesDialogProps} />
    </>
  )
}
