import { createFileRoute } from '@tanstack/react-router'
import { FinanceExpensesPage } from '@/features/finance/pages/expenses/finance-expenses-page'

export const Route = createFileRoute('/app/_authenticated/finance/expenses/')({
  component: FinanceExpensesPage,
})
