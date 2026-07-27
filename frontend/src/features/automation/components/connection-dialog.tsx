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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useMcpProviders } from '../hooks/use-mcp-servers'
import { useCreateConnection, useUpdateConnection } from '../hooks/use-connections'
import {
  connectionSchema,
  defaultConnectionValues,
  type ConnectionFormValues,
} from '../schemas/connection-schema'
import type { AutomationConnection } from '../types/automation'

type Props = {
  mode: 'create' | 'edit'
  connection?: AutomationConnection
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectionDialog({ mode, connection, open, onOpenChange }: Props) {
  const { data: providers = [] } = useMcpProviders()
  const create = useCreateConnection()
  const update = useUpdateConnection()
  const isEdit = mode === 'edit'

  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues: defaultConnectionValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        connection
          ? {
              provider: connection.provider,
              label: connection.label,
              credentialsJson: '',
            }
          : defaultConnectionValues
      )
    }
  }, [form, open, connection])

  async function submit(values: ConnectionFormValues) {
    if (isEdit && connection) {
      await update.mutateAsync({ id: connection.id, values: { label: values.label } })
    } else {
      await create.mutateAsync({
        provider: values.provider,
        label: values.label,
        credentials: JSON.parse(values.credentialsJson) as Record<string, unknown>,
      })
    }
    onOpenChange(false)
  }

  const pending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Connection' : 'New Connection'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this connection’s label. Credentials can only be changed via Rotate Credentials.'
              : 'Store a credential for an MCP provider. It is encrypted before it is ever written to the database.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='provider'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <FormControl>
                    <Select
                      disabled={isEdit}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select a registered provider' />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((name) => (
                          <SelectItem key={name} value={name} className='capitalize'>
                            {name}
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
              name='label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Personal Fake Connection' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEdit && (
              <FormField
                control={form.control}
                name='credentialsJson'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credentials (JSON)</FormLabel>
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
            )}
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={pending}>
                {pending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
