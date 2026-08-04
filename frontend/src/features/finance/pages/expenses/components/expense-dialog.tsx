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
import { DatePicker } from '@/components/date-picker'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useCreateExpense, useUpdateExpense } from '../../../hooks/use-expenses'
import {
  EXPENSE_CATEGORY_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from '../../../lib/category-labels'
import {
  defaultExpenseValues,
  expenseSchema,
  type ExpenseFormValues,
} from '../../../schemas/expense-schema'
import type { Expense } from '../../../types/finance'

type ExpenseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: Expense
}

// The <30-second entry path: amount and category are the only two fields
// above the fold. Payment method, notes, and "repeat monthly" are optional
// and collapse to a single row so they never slow down the common case.
export function ExpenseDialog({
  open,
  onOpenChange,
  expense,
}: ExpenseDialogProps) {
  const isEdit = Boolean(expense)

  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const isPending = createExpense.isPending || updateExpense.isPending

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: defaultExpenseValues,
  })

  useEffect(() => {
    if (!open) return

    if (expense) {
      form.reset({
        date: new Date(expense.date),
        amount: expense.amount,
        category: expense.category,
        paymentMethod: expense.paymentMethod ?? undefined,
        description: expense.description ?? '',
        isRecurring: expense.isRecurring,
      })
    } else {
      form.reset(defaultExpenseValues)
    }
  }, [expense, form, open])

  async function onSubmit(values: ExpenseFormValues) {
    const payload = {
      date: values.date.toISOString(),
      amount: values.amount,
      category: values.category,
      paymentMethod: values.paymentMethod,
      description: values.description || undefined,
    }

    if (isEdit && expense) {
      await updateExpense.mutateAsync({ id: expense.id, payload })
    } else {
      await createExpense.mutateAsync({
        ...payload,
        isRecurring: values.isRecurring,
      })
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
            <DialogTitle>{isEdit ? 'Edit Expense' : 'Add Expense'}</DialogTitle>

            <DialogDescription>
              {isEdit
                ? 'Update this expense.'
                : 'Log a new expense in a few seconds.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='amount'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>

                      <FormControl>
                        <Input
                          inputMode='decimal'
                          placeholder='0.00'
                          autoFocus
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='category'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>

                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select category' />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='date'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Date</FormLabel>

                    <FormControl>
                      <DatePicker
                        selected={field.value}
                        onSelect={field.onChange}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='paymentMethod'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>

                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Optional' />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {PAYMENT_METHOD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>

                    <FormControl>
                      <Textarea placeholder='Optional' rows={2} {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isEdit && (
                <FormField
                  control={form.control}
                  name='isRecurring'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-md border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel>Repeat monthly</FormLabel>
                        <p className='text-sm text-muted-foreground'>
                          Automatically log this expense again every month.
                        </p>
                      </div>

                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  disabled={isPending}
                  onClick={() => guardedOnOpenChange(false)}
                >
                  Cancel
                </Button>

                <Button type='submit' disabled={isPending}>
                  {isPending
                    ? 'Saving...'
                    : isEdit
                      ? 'Save Changes'
                      : 'Add Expense'}
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
