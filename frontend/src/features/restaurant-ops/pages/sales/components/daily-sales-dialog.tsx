import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/date-picker'
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
import { Textarea } from '@/components/ui/textarea'
import { useCreateDailySalesRecord, useSalesRecord, useUpdateDailySalesRecord } from '../../../hooks/use-sales'
import {
  dailySalesHeaderSchema,
  defaultDailySalesHeaderValues,
  posReportTypeOptions,
  salesSourceOptions,
  type DailySalesHeaderFormValues,
} from '../../../schemas/sales-schema'
import type { DailySalesRecord } from '../../../types/restaurant-ops'
import { CategoryEntrySection } from './category-entry-section'
import { ChannelEntrySection } from './channel-entry-section'
import { ItemEntrySection } from './item-entry-section'
import { PaymentMethodEntrySection } from './payment-method-entry-section'

type DailySalesDialogProps = {
  restaurantId: string
  branchId: string
  date: Date
  existingRecord?: DailySalesRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toHeaderValues(record?: DailySalesRecord | null, date?: Date): DailySalesHeaderFormValues {
  if (!record) {
    return { ...defaultDailySalesHeaderValues, businessDate: date ?? new Date() }
  }

  return {
    businessDate: new Date(`${record.businessDate}T00:00:00`),
    source: record.source,
    posReportType: record.posReportType ?? undefined,
    posReportNumber: record.posReportNumber ?? '',
    posReportedTotal: record.posReportedTotal ?? '',
    totalSales: record.totalSales,
    discountsTotal: record.discountsTotal,
    vouchersAmount: record.vouchersAmount,
    vouchersCount: record.vouchersCount?.toString() ?? '',
    notes: record.notes ?? '',
  }
}

// Two-phase dialog: the header form (Date/POS Report/Total Sales/
// Discounts/Vouchers/Notes) creates or updates the DailySalesRecord itself;
// once an id exists (either from a fresh create or an existing record
// passed in for editing), the four line-entry sections below become
// available, each behaving like RecipeIngredientsDialog's own add-line
// pattern. This mirrors the backend's individual-line-CRUD design — no
// giant single-submit payload.
export function DailySalesDialog({
  restaurantId,
  branchId,
  date,
  existingRecord,
  open,
  onOpenChange,
}: DailySalesDialogProps) {
  const [recordId, setRecordId] = useState<string | null>(existingRecord?.id ?? null)
  const { data: liveRecord } = useSalesRecord(recordId)
  const createRecord = useCreateDailySalesRecord(branchId)
  const updateRecord = useUpdateDailySalesRecord()

  const form = useForm<DailySalesHeaderFormValues>({
    resolver: zodResolver(dailySalesHeaderSchema),
    defaultValues: toHeaderValues(existingRecord, date),
  })

  useEffect(() => {
    if (!open) return
    setRecordId(existingRecord?.id ?? null)
    form.reset(toHeaderValues(existingRecord, date))
  }, [open, existingRecord, date, form])

  const source = form.watch('source')

  async function onSubmitHeader(values: DailySalesHeaderFormValues) {
    const payload = {
      businessDate: format(values.businessDate, 'yyyy-MM-dd'),
      source: values.source,
      posReportType: values.source === 'POS_REPORT' ? values.posReportType : undefined,
      posReportNumber: values.posReportNumber || undefined,
      posReportedTotal: values.posReportedTotal ? Number(values.posReportedTotal) : undefined,
      totalSales: Number(values.totalSales),
      discountsTotal: values.discountsTotal ? Number(values.discountsTotal) : undefined,
      vouchersAmount: values.vouchersAmount ? Number(values.vouchersAmount) : undefined,
      vouchersCount: values.vouchersCount ? Number(values.vouchersCount) : undefined,
      notes: values.notes || undefined,
    }

    if (recordId) {
      await updateRecord.mutateAsync({ salesId: recordId, payload })
    } else {
      const created = await createRecord.mutateAsync(payload)
      setRecordId(created.id)
    }
  }

  const isSaving = createRecord.isPending || updateRecord.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{recordId ? 'Edit Daily Sales' : 'Add Daily Sales'}</DialogTitle>
          <DialogDescription>
            Record this branch&rsquo;s sales for one business day &mdash; POS report totals, channel and
            payment method breakdowns, categories, and itemized sales.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitHeader)} className='space-y-4'>
            <div className='grid grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='businessDate'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DatePicker selected={field.value} onSelect={(d) => field.onChange(d ?? field.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='source'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {salesSourceOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option === 'POS_REPORT' ? 'POS Report' : 'Manual'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {source === 'POS_REPORT' && (
              <div className='grid grid-cols-3 gap-3 rounded-md border p-3'>
                <FormField
                  control={form.control}
                  name='posReportType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {posReportTypeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option === 'Z_REPORT' ? 'Z Report' : 'X Report'}
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
                  name='posReportNumber'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report / Z Number</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. 851' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='posReportedTotal'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>POS Total</FormLabel>
                      <FormControl>
                        <Input inputMode='decimal' placeholder='e.g. 1226.55' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name='totalSales'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Sales</FormLabel>
                  <FormControl>
                    <Input inputMode='decimal' placeholder='e.g. 1226.55' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-3 gap-3'>
              <FormField
                control={form.control}
                name='discountsTotal'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discounts</FormLabel>
                    <FormControl>
                      <Input inputMode='decimal' placeholder='0.00' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='vouchersAmount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vouchers Amount</FormLabel>
                    <FormControl>
                      <Input inputMode='decimal' placeholder='0.00' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='vouchersCount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vouchers Count</FormLabel>
                    <FormControl>
                      <Input inputMode='numeric' placeholder='0' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='notes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type='submit' disabled={isSaving} className='w-full'>
              {recordId ? 'Save Changes' : 'Create Daily Sales Record'}
            </Button>
          </form>
        </Form>

        {recordId && liveRecord && (
          <div className='space-y-6 border-t pt-4'>
            <ChannelEntrySection restaurantId={restaurantId} salesId={recordId} entries={liveRecord.channels} />
            <PaymentMethodEntrySection
              restaurantId={restaurantId}
              salesId={recordId}
              entries={liveRecord.paymentMethods}
            />
            <CategoryEntrySection restaurantId={restaurantId} salesId={recordId} entries={liveRecord.categories} />
            <ItemEntrySection restaurantId={restaurantId} salesId={recordId} entries={liveRecord.items} />
          </div>
        )}

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
