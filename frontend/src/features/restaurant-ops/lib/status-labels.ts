import type { MenuItemStatus, StockStatus } from '../types/restaurant-ops'

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
