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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useConnections } from '../hooks/use-connections'
import { useMcpProviders } from '../hooks/use-mcp-servers'
import { useCreateMcpServer, useUpdateMcpServer } from '../hooks/use-mcp-servers'
import {
  defaultMcpServerValues,
  mcpServerSchema,
  parseArgsText,
  type McpServerFormValues,
} from '../schemas/mcp-server-schema'
import type { McpServerConfig } from '../types/automation'

const NONE_CONNECTION_VALUE = '__none__'

type Props = {
  mode: 'create' | 'edit'
  server?: McpServerConfig
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function McpServerDialog({ mode, server, open, onOpenChange }: Props) {
  const { data: providers = [] } = useMcpProviders()
  const { data: connections = [] } = useConnections()
  const create = useCreateMcpServer()
  const update = useUpdateMcpServer()
  const isEdit = mode === 'edit'

  const form = useForm<McpServerFormValues>({
    resolver: zodResolver(mcpServerSchema),
    defaultValues: defaultMcpServerValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        server
          ? {
              name: server.name,
              provider: server.provider,
              transport: server.transport,
              command: server.command ?? '',
              argsText: server.args.join('\n'),
              url: server.url ?? '',
              connectionId: server.connectionId ?? '',
              isEnabled: server.isEnabled,
            }
          : defaultMcpServerValues
      )
    }
  }, [form, open, server])

  async function submit(values: McpServerFormValues) {
    const payload = {
      name: values.name,
      transport: values.transport,
      command: values.command || undefined,
      args: parseArgsText(values.argsText),
      url: values.url || undefined,
      connectionId: values.connectionId || undefined,
      isEnabled: values.isEnabled,
    }

    if (isEdit && server) {
      await update.mutateAsync({ id: server.id, values: payload })
    } else {
      await create.mutateAsync({ ...payload, provider: values.provider })
    }
    onOpenChange(false)
  }

  const pending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit MCP Server' : 'Register MCP Server'}</DialogTitle>
          <DialogDescription>
            Configure a server instance for a registered MCP connector type.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Fake Dev Server' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid gap-4 sm:grid-cols-2'>
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
                          <SelectValue placeholder='Select a provider' />
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
                name='transport'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transport</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='STDIO'>STDIO</SelectItem>
                          <SelectItem value='HTTP'>HTTP</SelectItem>
                          <SelectItem value='SSE'>SSE</SelectItem>
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
              name='command'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Command (STDIO only)</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. npx' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='argsText'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Args (one per line)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} className='font-mono text-sm' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='url'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL (HTTP/SSE only)</FormLabel>
                  <FormControl>
                    <Input placeholder='http://127.0.0.1:8188' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='connectionId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection (optional)</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || NONE_CONNECTION_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === NONE_CONNECTION_VALUE ? '' : value)
                      }
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='No credential needed' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_CONNECTION_VALUE}>None</SelectItem>
                        {connections.map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            {connection.label} ({connection.provider})
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
