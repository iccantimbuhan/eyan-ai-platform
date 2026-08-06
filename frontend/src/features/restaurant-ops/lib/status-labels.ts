import type { MenuItemStatus } from '../types/restaurant-ops'

export const MENU_ITEM_STATUS_OPTIONS: { value: MenuItemStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
]

export function menuItemStatusLabel(status: MenuItemStatus): string {
  return MENU_ITEM_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}
