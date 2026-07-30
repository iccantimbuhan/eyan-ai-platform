import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useExpenseDialog } from '../../hooks/use-expense-dialog'
import { useExpenses } from '../../hooks/use-expenses'
import { ExpenseDialog } from './components/expense-dialog'
import { ExpenseTable } from './components/expense-table'

export function FinanceExpensesPage() {
  const can = useCan()
  const { data, isLoading, error } = useExpenses()
  const createDialog = useExpenseDialog()

  if (!can('finance')) return <ForbiddenError />

  if (isLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>Loading expenses...</div>
      </Main>
    )
  }

  if (error) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center text-destructive'>
          Failed to load expenses.
        </div>
      </Main>
    )
  }

  return (
    <>
      <Main className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Expenses</h1>

            <p className='text-muted-foreground'>Track where your money goes.</p>
          </div>

          <Button onClick={createDialog.openDialog}>Add Expense</Button>
        </div>

        <ExpenseTable expenses={data?.data ?? []} />
      </Main>

      <ExpenseDialog open={createDialog.open} onOpenChange={createDialog.setOpen} />
    </>
  )
}
