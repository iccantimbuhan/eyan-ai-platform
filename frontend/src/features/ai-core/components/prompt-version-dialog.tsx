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
import { Textarea } from '@/components/ui/textarea'
import { useCreatePrompt } from '../hooks/use-prompts'
import { defaultPromptValues, promptSchema, type PromptFormValues } from '../schemas/prompt-schema'

type Props = { brainId: string; open: boolean; onOpenChange: (open: boolean) => void }

// Additive-only (ADR-0020 Decision 2 / TDD §10) — never edits an existing
// version, only creates a new one. Activate it from the Prompt Library
// list once saved.
export function PromptVersionDialog({ brainId, open, onOpenChange }: Props) {
  const create = useCreatePrompt(brainId)

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: defaultPromptValues,
  })

  useEffect(() => {
    if (open) form.reset(defaultPromptValues)
  }, [form, open])

  async function submit(values: PromptFormValues) {
    await create.mutateAsync(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>New Prompt Version</DialogTitle>
          <DialogDescription>
            Saves a new inactive version — activate it from the list once you're ready to route traffic through it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='version'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. v2' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='body'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea rows={14} className='font-mono text-sm' {...field} />
                  </FormControl>
                  <FormMessage />
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
