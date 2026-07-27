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
import { Textarea } from '@/components/ui/textarea'
import { useRotateConnectionCredentials } from '../hooks/use-connections'
import {
  rotateCredentialsSchema,
  type RotateCredentialsFormValues,
} from '../schemas/connection-schema'
import type { AutomationConnection } from '../types/automation'

type Props = {
  connection: AutomationConnection
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RotateCredentialsDialog({ connection, open, onOpenChange }: Props) {
  const rotate = useRotateConnectionCredentials()
  const form = useForm<RotateCredentialsFormValues>({
    resolver: zodResolver(rotateCredentialsSchema),
    defaultValues: { credentialsJson: '' },
  })

  useEffect(() => {
    if (open) form.reset({ credentialsJson: '' })
  }, [form, open])

  async function submit(values: RotateCredentialsFormValues) {
    await rotate.mutateAsync({
      id: connection.id,
      credentials: JSON.parse(values.credentialsJson) as Record<string, unknown>,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Rotate Credentials</DialogTitle>
          <DialogDescription>
            Replace {connection.label}’s stored credentials with a new value.
            The previous credentials cannot be recovered afterward.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='credentialsJson'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Credentials (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{"apiKey": "..."}'
                      className='font-mono text-sm'
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={rotate.isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={rotate.isPending}>
                {rotate.isPending ? 'Rotating...' : 'Rotate Credentials'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
