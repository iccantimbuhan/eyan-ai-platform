// Display-only formatting. Money math never happens client-side — every
// amount already arrives as a server-computed, fixed-point string (see the
// backend's finance-expense.mapper.ts comment on why).
export function formatCurrency(amount: string | number): string {
  const value = typeof amount === 'string' ? Number(amount) : amount

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number.isFinite(value) ? value : 0)
}
