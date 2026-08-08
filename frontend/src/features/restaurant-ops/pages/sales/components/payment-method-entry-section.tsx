import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useCreatePosSource,
  useCreateSalesPaymentMethod,
  usePosSources,
  useSalesPaymentMethods,
  useUpdateSalesPaymentMethod,
} from '../../../hooks/use-sales-reference'
import { useCreatePaymentMethodEntry, useDeletePaymentMethodEntry } from '../../../hooks/use-sales'
import {
  defaultPaymentMethodEntryValues,
  paymentMethodEntrySchema,
  type PaymentMethodEntryFormValues,
} from '../../../schemas/sales-schema'
import type { SalesPaymentMethodEntry } from '../../../types/restaurant-ops'

type PaymentMethodEntrySectionProps = {
  restaurantId: string
  salesId: string
  entries: SalesPaymentMethodEntry[]
}

const NO_POS_SOURCE = '__none__'

// POS Source / Sales Channel Flexibility, extended to Payment Methods —
// mirrors ChannelEntrySection's optional POS Source select exactly. A
// single-POS restaurant never touches it; a restaurant reporting via
// multiple POS terminals (e.g. POS 1: Cash/Card/Wolt, POS 2: Wolt/Bolt)
// can tag each line, and the same payment method (e.g. "Wolt") can be
// entered separately under each POS source on the same business day.
export function PaymentMethodEntrySection({ restaurantId, salesId, entries }: PaymentMethodEntrySectionProps) {
  const { data: methods } = useSalesPaymentMethods(restaurantId)
  const { data: posSources } = usePosSources(restaurantId)
  const createMethod = useCreateSalesPaymentMethod(restaurantId)
  const updateMethod = useUpdateSalesPaymentMethod(restaurantId)
  const createPosSource = useCreatePosSource(restaurantId)
  const createEntry = useCreatePaymentMethodEntry()
  const deleteEntry = useDeletePaymentMethodEntry()
  const [newMethodName, setNewMethodName] = useState('')
  const [newPosSourceName, setNewPosSourceName] = useState('')

  const form = useForm<PaymentMethodEntryFormValues>({
    resolver: zodResolver(paymentMethodEntrySchema),
    defaultValues: defaultPaymentMethodEntryValues,
  })

  useEffect(() => {
    form.reset(defaultPaymentMethodEntryValues)
  }, [salesId, form])

  async function onSubmit(values: PaymentMethodEntryFormValues) {
    await createEntry.mutateAsync({
      salesId,
      salesPaymentMethodId: values.salesPaymentMethodId,
      amount: Number(values.amount),
      posSourceId: values.posSourceId && values.posSourceId !== NO_POS_SOURCE ? values.posSourceId : undefined,
      transactionCount: values.transactionCount ? Number(values.transactionCount) : undefined,
    })
    form.reset(defaultPaymentMethodEntryValues)
  }

  async function addNewMethod() {
    if (!newMethodName.trim()) return
    const method = await createMethod.mutateAsync(newMethodName.trim())
    form.setValue('salesPaymentMethodId', method.id)
    setNewMethodName('')
  }

  async function addNewPosSource() {
    if (!newPosSourceName.trim()) return
    const posSource = await createPosSource.mutateAsync(newPosSourceName.trim())
    form.setValue('posSourceId', posSource.id)
    setNewPosSourceName('')
  }

  return (
    <div className='space-y-3'>
      <p className='text-sm font-medium'>Payment Methods</p>

      <div className='space-y-2'>
        {entries.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No payment method entries yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className='flex items-center justify-between rounded-md border px-3 py-2'>
              <span className='text-sm'>
                {entry.paymentMethodName}: &euro;{entry.amount}
                {entry.posSourceName ? ` (${entry.posSourceName})` : ''}
                {entry.transactionCount !== null ? ` (${entry.transactionCount} tx)` : ''}
              </span>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                disabled={deleteEntry.isPending}
                onClick={() => deleteEntry.mutate({ salesId, entryId: entry.id })}
              >
                <Trash2 className='h-4 w-4 text-destructive' />
              </Button>
            </div>
          ))
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-wrap items-end gap-2'>
          <FormField
            control={form.control}
            name='salesPaymentMethodId'
            render={({ field }) => (
              <FormItem className='min-w-[140px] flex-1'>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label='Payment method'>
                      <SelectValue placeholder='Payment method' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(methods ?? []).map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='posSourceId'
            render={({ field }) => (
              <FormItem className='w-36'>
                <Select value={field.value || NO_POS_SOURCE} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label='POS source'>
                      <SelectValue placeholder='POS (optional)' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_POS_SOURCE}>No POS source</SelectItem>
                    {(posSources ?? []).map((posSource) => (
                      <SelectItem key={posSource.id} value={posSource.id}>
                        {posSource.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='amount'
            render={({ field }) => (
              <FormItem className='w-24'>
                <FormControl>
                  <Input inputMode='decimal' placeholder='Amount' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='transactionCount'
            render={({ field }) => (
              <FormItem className='w-20'>
                <FormControl>
                  <Input inputMode='numeric' placeholder='Tx #' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' size='icon' aria-label='Add payment method entry' disabled={createEntry.isPending}>
            <Plus className='h-4 w-4' />
          </Button>
        </form>
      </Form>

      <div className='flex flex-wrap items-end gap-2'>
        <Input
          placeholder='New payment method name (e.g. Cash Guard)'
          value={newMethodName}
          onChange={(e) => setNewMethodName(e.target.value)}
          className='min-w-[160px] flex-1'
        />
        <Button type='button' variant='outline' size='sm' onClick={addNewMethod} disabled={createMethod.isPending}>
          Add Payment Method
        </Button>
        <Input
          placeholder='New POS source (e.g. POS 1)'
          value={newPosSourceName}
          onChange={(e) => setNewPosSourceName(e.target.value)}
          className='min-w-[160px] flex-1'
        />
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={addNewPosSource}
          disabled={createPosSource.isPending}
        >
          Add POS Source
        </Button>
      </div>

      {(methods ?? []).length > 0 && (
        <div className='space-y-1.5 rounded-md border p-3'>
          <p className='text-xs font-medium text-muted-foreground'>
            Physical cash classification — used by Cash Reconciliation to tell physical cash apart from card/
            electronic payment methods.
          </p>
          <div className='flex flex-wrap gap-x-4 gap-y-2'>
            {(methods ?? []).map((method) => (
              <div key={method.id} className='flex items-center gap-2'>
                <Checkbox
                  id={`cash-equivalent-${method.id}`}
                  checked={method.isCashEquivalent}
                  disabled={updateMethod.isPending}
                  onCheckedChange={(checked) =>
                    updateMethod.mutate({ id: method.id, isCashEquivalent: checked === true })
                  }
                />
                <Label htmlFor={`cash-equivalent-${method.id}`} className='text-sm font-normal'>
                  {method.name} is physical cash
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
