import { useEffect, useMemo } from 'react'
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
import { useModels } from '../hooks/use-models'
import { useProviders } from '../hooks/use-providers'
import { useCreateRoutingPolicy } from '../hooks/use-routing-policy'
import {
  defaultRoutingPolicyValues,
  NONE_FALLBACK_VALUE,
  routingPolicySchema,
  type RoutingPolicyFormValues,
} from '../schemas/routing-policy-schema'

type Props = { brainId: string; open: boolean; onOpenChange: (open: boolean) => void }

const STRATEGIES = ['COST', 'LATENCY', 'QUALITY', 'BALANCED'] as const

// Always creates a new, initially-inactive additive version (TDD §8's
// isActive-flag versioning, same as Prompts) — there is no "edit an
// existing policy" backend endpoint by design. Activate it from the
// Routing Policy list once saved.
export function RoutingPolicyDialog({ brainId, open, onOpenChange }: Props) {
  const { data: providers = [] } = useProviders()
  const { data: models = [] } = useModels()
  const create = useCreateRoutingPolicy(brainId)

  const form = useForm<RoutingPolicyFormValues>({
    resolver: zodResolver(routingPolicySchema),
    defaultValues: defaultRoutingPolicyValues,
  })

  useEffect(() => {
    if (open) form.reset(defaultRoutingPolicyValues)
  }, [form, open])

  const preferredProviderId = form.watch('preferredProviderId')
  const fallbackProviderId = form.watch('fallbackProviderId')
  const preferredModels = useMemo(
    () => models.filter((model) => model.providerId === preferredProviderId),
    [models, preferredProviderId]
  )
  const fallbackModels = useMemo(
    () => models.filter((model) => model.providerId === fallbackProviderId),
    [models, fallbackProviderId]
  )

  async function submit(values: RoutingPolicyFormValues) {
    await create.mutateAsync({
      strategy: values.strategy,
      requiredTag: values.requiredTag || undefined,
      preferredProviderId: values.preferredProviderId,
      preferredModelId: values.preferredModelId,
      fallbackProviderId: values.fallbackProviderId === NONE_FALLBACK_VALUE ? undefined : values.fallbackProviderId,
      fallbackModelId: values.fallbackModelId === NONE_FALLBACK_VALUE ? undefined : values.fallbackModelId,
      maxRetries: values.maxRetries,
      timeoutMs: values.timeoutMs,
      confidenceHighThreshold: values.confidenceHighThreshold,
      confidenceMediumThreshold: values.confidenceMediumThreshold,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>New Routing Policy Version</DialogTitle>
          <DialogDescription>
            Saves a new inactive version — activate it from the list once you're ready to route traffic through it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='strategy'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strategy</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STRATEGIES.map((strategy) => (
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
              <FormField
                control={form.control}
                name='requiredTag'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Model Tag (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. reasoning' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='preferredProviderId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Provider</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.setValue('preferredModelId', '')
                        }}
                      >
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
                name='preferredModelId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Model</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!preferredProviderId}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select a model' />
                        </SelectTrigger>
                        <SelectContent>
                          {preferredModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.displayName}
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

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='fallbackProviderId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fallback Provider (optional)</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.setValue('fallbackModelId', NONE_FALLBACK_VALUE)
                        }}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_FALLBACK_VALUE}>None</SelectItem>
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
                name='fallbackModelId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fallback Model</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!fallbackProviderId || fallbackProviderId === NONE_FALLBACK_VALUE}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_FALLBACK_VALUE}>None</SelectItem>
                          {fallbackModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.displayName}
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

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='maxRetries'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Retries</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        max={10}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='timeoutMs'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeout (ms)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={1000}
                        step={1000}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='confidenceHighThreshold'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidence High Threshold</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        max={1}
                        step={0.01}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confidenceMediumThreshold'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidence Medium Threshold</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        max={1}
                        step={0.01}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
