import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { PiggyBank, Receipt, Wallet, WalletCards } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useFinanceDashboard } from '../../hooks/use-finance-dashboard'
import { categoryLabel } from '../../lib/category-labels'
import { formatCurrency } from '../../lib/format-currency'
import { CategoryBreakdownChart } from './components/category-breakdown-chart'
import { SetBudgetDialog } from './components/set-budget-dialog'
import { SpendingTrendChart } from './components/spending-trend-chart'

export function FinanceDashboardPage() {
  const can = useCan()
  const { data, isLoading, error } = useFinanceDashboard()
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)

  if (!can('finance')) return <ForbiddenError />

  if (isLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>Loading dashboard...</div>
      </Main>
    )
  }

  if (error || !data) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center text-destructive'>
          Failed to load the finance dashboard.
        </div>
      </Main>
    )
  }

  return (
    <>
      <Main className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Finance</h1>
            <p className='text-muted-foreground'>
              {format(new Date(`${data.period}-01T00:00:00`), 'MMMM yyyy')} overview.
            </p>
          </div>

          <Button asChild>
            <Link to='/app/finance/expenses'>Add Expense</Link>
          </Button>
        </div>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <button
            type='button'
            onClick={() => setBudgetDialogOpen(true)}
            className='text-start'
          >
            <StatCard
              title='Monthly Budget'
              value={data.budget ? formatCurrency(data.budget.monthlyLimit) : 'Not set'}
              description={data.budget ? 'Tap to edit' : 'Tap to set your budget'}
              icon={<Wallet />}
            />
          </button>

          <StatCard
            title='Total Expenses'
            value={formatCurrency(data.totalExpenses)}
            description='This month'
            icon={<Receipt />}
          />

          <StatCard
            title='Remaining Budget'
            value={data.remainingBudget ? formatCurrency(data.remainingBudget) : '—'}
            description={
              data.remainingBudget && Number(data.remainingBudget) < 0
                ? 'Over budget'
                : 'This month'
            }
            icon={<WalletCards />}
          />

          <StatCard
            title='Savings'
            value='—'
            description='Coming soon'
            icon={<PiggyBank />}
          />
        </div>

        <div className='grid gap-4 lg:grid-cols-2'>
          <SpendingTrendChart spendingTrend={data.spendingTrend} />
          <CategoryBreakdownChart categoryBreakdown={data.categoryBreakdown} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentExpenses.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No expenses yet.</p>
            ) : (
              <div className='divide-y'>
                {data.recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className='flex items-center justify-between py-3 first:pt-0 last:pb-0'
                  >
                    <div className='flex items-center gap-3'>
                      <Badge variant='secondary'>{categoryLabel(expense.category)}</Badge>
                      <div>
                        <p className='text-sm font-medium'>
                          {expense.description || categoryLabel(expense.category)}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className='font-medium'>{formatCurrency(expense.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Main>

      <SetBudgetDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        period={data.period}
        currentLimit={data.budget?.monthlyLimit}
      />
    </>
  )
}
