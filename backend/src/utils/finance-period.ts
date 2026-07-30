// Shared "YYYY-MM" period helpers used by FinanceGenerationService,
// FinanceBudgetService, and FinanceDashboardService — the lazy-generation
// checkpoint, the one-row-per-month Budget, and the dashboard's monthly
// aggregate window all key off the same period string format.

export function currentPeriod(): string {
  return periodOf(new Date());
}

export function periodOf(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function periodStart(period: string): Date {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

export function periodEnd(period: string): Date {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export function nextPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const next = new Date(year, month, 1);
  return periodOf(next);
}

// Oldest-first list of `count` periods ending at (and including) `period` —
// used by the Dashboard's spending-trend widget.
export function trailingPeriods(period: string, count: number): string[] {
  const [year, month] = period.split("-").map(Number);
  const periods: string[] = [];

  for (let i = count - 1; i >= 0; i--) {
    periods.push(periodOf(new Date(year, month - 1 - i, 1)));
  }

  return periods;
}

export function isPeriodBefore(a: string, b: string): boolean {
  return a < b;
}

// Clamps dayOfMonth to the real last day of a short month (e.g. 31 in
// February lands on the 28th/29th, never rolls into March).
export function clampToMonth(period: string, dayOfMonth: number): Date {
  const [year, month] = period.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.min(dayOfMonth, daysInMonth);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}
