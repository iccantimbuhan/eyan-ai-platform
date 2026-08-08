import type { CashReconciliationStatus, MenuItemStatus, StockStatus } from '../types/restaurant-ops'

export const MENU_ITEM_STATUS_OPTIONS: { value: MenuItemStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
]

export function menuItemStatusLabel(status: MenuItemStatus): string {
  return MENU_ITEM_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

// Inventory Foundation (Sprint 2A) — status is computed server-side
// (never stored, see inventory-item.mapper.ts's computeStockStatus); this
// is display-only labeling/coloring, not the source of truth.
const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
}

export function stockStatusLabel(status: StockStatus): string {
  return STOCK_STATUS_LABELS[status] ?? status
}

const STOCK_STATUS_BADGE_CLASSNAMES: Record<StockStatus, string> = {
  IN_STOCK: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  LOW_STOCK: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  OUT_OF_STOCK: '',
}

export function stockStatusBadgeClassName(status: StockStatus): string {
  return STOCK_STATUS_BADGE_CLASSNAMES[status] ?? ''
}

// Cash Reconciliation (ADR-0043) — status is computed server-side (never
// stored, see computeCashReconciliation); this is display-only
// labeling/coloring/iconography, not the source of truth. NOT_COUNTED is a
// distinct, neutral state — never rendered as if it were BALANCED.
const CASH_RECONCILIATION_STATUS_LABELS: Record<CashReconciliationStatus, string> = {
  BALANCED: 'Balanced',
  SHORT: 'Short',
  OVER: 'Over',
  NOT_COUNTED: 'Not Counted',
}

export function cashReconciliationStatusLabel(status: CashReconciliationStatus): string {
  return CASH_RECONCILIATION_STATUS_LABELS[status] ?? status
}

const CASH_RECONCILIATION_STATUS_BADGE_CLASSNAMES: Record<CashReconciliationStatus, string> = {
  BALANCED: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  SHORT: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  OVER: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  NOT_COUNTED: 'border-transparent bg-muted text-muted-foreground',
}

export function cashReconciliationStatusBadgeClassName(status: CashReconciliationStatus): string {
  return CASH_RECONCILIATION_STATUS_BADGE_CLASSNAMES[status] ?? ''
}

// A short glyph prefix so the status reads even without color perception —
// the UI must never rely on color alone (spec).
const CASH_RECONCILIATION_STATUS_ICONS: Record<CashReconciliationStatus, string> = {
  BALANCED: '✓',
  SHORT: '\u{1F534}',
  OVER: '⚠',
  NOT_COUNTED: '—',
}

export function cashReconciliationStatusIcon(status: CashReconciliationStatus): string {
  return CASH_RECONCILIATION_STATUS_ICONS[status] ?? ''
}
