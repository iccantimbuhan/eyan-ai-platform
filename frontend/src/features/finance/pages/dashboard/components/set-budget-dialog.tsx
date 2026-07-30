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
import { useSetBudget } from '../../../hooks/use-budget'
import { budgetSchema, type BudgetFormValues } from '../../../schemas/budget-schema'

type SetBudgetDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: string
  currentLimit?: string
}

export function SetBudgetDialog({
  open,
  onOpenChange,
  period,
  currentLimit,
}: SetBudgetDialogProps) {
  const setBudget = useSetBudget()

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { monthlyLimit: currentLimit ?? '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ monthlyLimit: currentLimit ?? '' })
    }
  }, [currentLimit, form, open])

  async function onSubmit(values: BudgetFormValues) {
    await setBudget.mutateAsync({ period, monthlyLimit: values.monthlyLimit })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Monthly Budget</DialogTitle>
          <DialogDescription>
            Set how much your household plans to spend this month.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='monthlyLimit'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Budget</FormLabel>

                  <FormControl>
                    <Input inputMode='decimal' placeholder='1900.00' autoFocus {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                disabled={setBudget.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button type='submit' disabled={setBudget.isPending}>
                {setBudget.isPending ? 'Saving...' : 'Save Budget'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
