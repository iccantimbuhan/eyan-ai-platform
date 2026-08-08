export type MenuItemStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

// Sprint 1.2 (ADR-0036) — the seven named operational roles. STAFF still
// exists in the backend enum for Postgres backward compatibility only and
// is deliberately omitted here — no new grant should ever use it.
export type TenantRole =
  | 'OWNER'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'CASHIER'
  | 'KITCHEN'
  | 'INVENTORY_STAFF'
  | 'ACCOUNTANT'

export type StaffMembershipScope = 'ORGANIZATION' | 'RESTAURANT' | 'BRANCH'

export interface StaffMembershipGrant {
  scope: StaffMembershipScope
  scopeId: string
  scopeName: string
  role: TenantRole
  assignedAt: string
}

export interface StaffMember {
  userId: string
  name: string
  email: string
  isActive: boolean
  grants: StaffMembershipGrant[]
}

export interface Restaurant {
  id: string
  organizationId: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Branch {
  id: string
  restaurantId: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface MenuCategory {
  id: string
  restaurantId: string
  name: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface MenuItem {
  id: string
  restaurantId: string
  menuCategoryId: string
  name: string
  description: string | null
  price: string
  imagePath: string | null
  available: boolean
  status: MenuItemStatus
  createdAt: string
  updatedAt: string
}

// Restaurant Product Foundation (Sprint 1.3) — Restaurant owns Ingredients,
// Suppliers, Units, Ingredient Categories, and Recipes. Inventory (Sprint
// 2+, Branch-scoped) will only manage stock against these, never own
// product knowledge itself.
export interface Unit {
  id: string
  restaurantId: string
  name: string
  abbreviation: string
  createdAt: string
  updatedAt: string
}

export interface IngredientCategory {
  id: string
  restaurantId: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  restaurantId: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface IngredientSupplierSummary {
  id: string
  name: string
}

export interface Ingredient {
  id: string
  restaurantId: string
  ingredientCategoryId: string | null
  name: string
  suppliers: IngredientSupplierSummary[]
  createdAt: string
  updatedAt: string
}

export interface RecipeIngredientLine {
  id: string
  ingredientId: string
  ingredientName: string
  unitId: string
  unitAbbreviation: string
  quantity: string
}

export interface Recipe {
  id: string
  restaurantId: string
  menuItemId: string
  notes: string | null
  ingredients: RecipeIngredientLine[]
  createdAt: string
  updatedAt: string
}

// Inventory Foundation (Sprint 2A, ADR-0038) — Branch-scoped, per
// ADR-0037: Restaurant owns product knowledge (Ingredient/Unit above);
// Branch owns stock. status is computed server-side (never stored) from
// currentQuantity vs minimumQuantity — always trust this field over
// recomputing it in the frontend.
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export interface InventoryItem {
  id: string
  branchId: string
  restaurantId: string
  ingredientId: string
  ingredientName: string
  unitId: string
  unitAbbreviation: string
  currentQuantity: string
  minimumQuantity: string
  status: StockStatus
  createdAt: string
  updatedAt: string
}

export type StockMovementType = 'OPENING_STOCK' | 'ADJUSTMENT' | 'WASTE' | 'STOCK_COUNT'

export interface StockMovement {
  id: string
  inventoryItemId: string
  branchId: string
  unitId: string
  unitAbbreviation: string
  type: StockMovementType
  quantityDelta: string
  quantityAfter: string
  reason: string | null
  createdById: string
  createdByName: string
  createdAt: string
}

// Sales Foundation (Sprint 2C, ADR-0039) — Branch-scoped, mirrors
// Inventory's ownership posture. Reference lists (channel/payment method/
// category) are Restaurant-scoped configurable vocabulary, same posture as
// Unit — never a hardcoded enum, a manager can add their own.
export interface SalesReference {
  id: string
  restaurantId: string
  name: string
  createdAt: string
  updatedAt: string
}

// SalesPaymentMethod is the only reference list with a field beyond name
// (ADR-0043) — isCashEquivalent is catalog-level, so it applies to every
// entry referencing this payment method regardless of POS source.
export interface SalesPaymentMethodReference extends SalesReference {
  isCashEquivalent: boolean
}

export type SalesSource = 'MANUAL' | 'POS_REPORT'
export type PosReportType = 'Z_REPORT' | 'X_REPORT'

export interface SalesChannelEntry {
  id: string
  salesChannelId: string
  channelName: string
  // POS Source / Sales Channel Flexibility — optional, which POS terminal
  // reported this line. null in the common single-POS case, or when the
  // assigned POS source was later deleted. Never a fixed channel-to-POS
  // mapping — see PosSource below.
  posSourceId: string | null
  posSourceName: string | null
  amount: string
  transactionCount: number | null
  createdAt: string
}

export interface SalesPaymentMethodEntry {
  id: string
  salesPaymentMethodId: string
  paymentMethodName: string
  // POS Source / Sales Channel Flexibility, extended to Payment Methods —
  // mirrors SalesChannelEntry.posSourceId/posSourceName exactly.
  posSourceId: string | null
  posSourceName: string | null
  amount: string
  transactionCount: number | null
  // Catalog-level cash classification (ADR-0043), read off the referenced
  // SalesPaymentMethod — splits a record's payment methods into Physical
  // Cash vs Card/Electronic without a second lookup.
  isCashEquivalent: boolean
  createdAt: string
}

export interface SalesCategoryEntry {
  id: string
  salesCategoryId: string
  categoryName: string
  quantity: string | null
  amount: string
  createdAt: string
}

export interface SalesItemEntry {
  id: string
  menuItemId: string | null
  itemName: string
  categoryName: string | null
  quantity: string
  amount: string
  // POS-reported %QT/%SALE — transcribed as printed on the POS X/Z report.
  // Never confuse with Sprint 2D's own computed analytics percentages.
  // null when this entry wasn't sourced from a POS report.
  posQuantityPercent: string | null
  posSalesPercent: string | null
  createdAt: string
}

// Sprint 2B Prep — an optional per-channel price/availability override for
// a MenuItem. price is null when this channel has no override (falls back
// to the MenuItem's own base price). Never written onto SalesItemEntry or
// any historical sales row — read-only convenience data for the Daily
// Sales item-entry form.
export interface SalesChannelMenuItem {
  id: string
  restaurantId: string
  salesChannelId: string
  channelName: string
  menuItemId: string
  price: string | null
  available: boolean
  createdAt: string
  updatedAt: string
}

// RAW INPUT — one business day's manually-entered sales record for one
// Branch. Never confuse this with a WeeklySalesSummary below, which is a
// CALCULATED SUMMARY computed on read, never stored.
export interface DailySalesRecord {
  id: string
  branchId: string
  restaurantId: string
  businessDate: string
  source: SalesSource
  posReportType: PosReportType | null
  posReportNumber: string | null
  posReportedTotal: string | null
  totalSales: string
  discountsTotal: string
  vouchersAmount: string
  vouchersCount: number | null
  // Manager-entered physical cash count for the whole day (ADR-0043). Null
  // until entered — never inferred from POS data.
  actualCashCounted: string | null
  notes: string | null
  channels: SalesChannelEntry[]
  paymentMethods: SalesPaymentMethodEntry[]
  categories: SalesCategoryEntry[]
  items: SalesItemEntry[]
  // Sprint 2D — the same reconciliation shape the weekly summary uses,
  // computed server-side for this single day.
  reconciliation: SalesReconciliation
  // ADR-0043 — a separate calculation from reconciliation above; never
  // touches totalSales, only payment-method entries/discountsTotal/
  // actualCashCounted. Computed fresh on every read, never persisted.
  cashReconciliation: CashReconciliation
  createdAt: string
  updatedAt: string
}

export interface DailySalesRecordListItem {
  id: string
  branchId: string
  businessDate: string
  source: SalesSource
  totalSales: string
  createdAt: string
}

// BALANCED/SHORT/OVER only apply once a manager has entered a cash count;
// NOT_COUNTED is a distinct state, never treated as BALANCED (ADR-0043).
export type CashReconciliationStatus = 'BALANCED' | 'SHORT' | 'OVER' | 'NOT_COUNTED'

export interface DailySalesTotal {
  date: string
  totalSales: string
  // Independent figures shown alongside totalSales — never assumed to
  // reconcile with it (ADR-0039 Decision 2/3).
  posReportedTotal: string | null
  channelEntriesTotal: string
  // Cash reconciliation for this one day (ADR-0043), flattened onto this
  // row rather than nested, matching this DTO's existing flat shape.
  discountsTotal: string
  physicalCashBasis: string
  expectedCash: string
  actualCashCounted: string | null
  discrepancy: string | null
  status: CashReconciliationStatus
}

export interface ChannelTotal {
  salesChannelId: string
  channelName: string
  amount: string
  // Share of this breakdown's OWN recorded total (Σ channel entries), never
  // a share of totalSales — the two are independent figures that are not
  // guaranteed to reconcile. null when the breakdown's own total is zero.
  percentOfChannelEntriesTotal: string | null
  activeDays: number
  averageAmountPerActiveDay: string | null
}

// POS Source / Sales Channel Flexibility — sales by POS terminal. Both id
// and name are null for the "unassigned" bucket (entries with no
// posSourceId — the common single-POS case), which is always present
// alongside real POS sources rather than dropped.
export interface PosSourceTotal {
  posSourceId: string | null
  posSourceName: string | null
  amount: string
  transactionCount: number
  percentOfChannelEntriesTotal: string | null
}

// Answers "sales by POS + channel combination" — one row per POS source
// (including the unassigned bucket), each with its own channel breakdown.
export interface PosSourceChannelBreakdown {
  posSourceId: string | null
  posSourceName: string | null
  channels: ChannelTotal[]
}

export interface PaymentMethodTotal {
  salesPaymentMethodId: string
  paymentMethodName: string
  // Catalog-level classification (ADR-0043) — splits this breakdown into
  // Physical Cash vs Card/Electronic without a second lookup.
  isCashEquivalent: boolean
  amount: string
  transactionCount: number
  percentOfPaymentMethodEntriesTotal: string | null
}

// POS Source / Sales Channel Flexibility, extended to Payment Methods —
// mirrors PosSourceTotal/PosSourceChannelBreakdown exactly, kept as a
// SEPARATE figure from the channel dimension (never merged into one
// combined POS total — a POS's channel total and its payment-method total
// are independent facts, per ADR-0039).
export interface PaymentMethodPosSourceTotal {
  posSourceId: string | null
  posSourceName: string | null
  amount: string
  transactionCount: number
  percentOfPaymentMethodEntriesTotal: string | null
}

export interface PosSourcePaymentMethodBreakdown {
  posSourceId: string | null
  posSourceName: string | null
  paymentMethods: PaymentMethodTotal[]
}

export interface CategoryTotal {
  salesCategoryId: string
  categoryName: string
  quantity: string | null
  amount: string
  percentOfCategoryEntriesTotal: string | null
}

export interface TopItem {
  key: string
  itemName: string
  quantity: string
  amount: string
}

// Days in the requested range with no DailySalesRecord at all — distinct
// from a recorded day with €0 sales. Never treated as zero (spec §G).
export interface SalesDataCoverage {
  daysInRange: number
  daysRecorded: number
  missingDays: number
  missingDates: string[]
  averageSalesPerRecordedDay: string | null
}

// A non-zero variance is not automatically an error — display it neutrally
// ("recorded difference — requires review"), never mutate the underlying
// records to "fix" it (ADR-0039 Decision 2/3, spec §F).
export interface SalesReconciliation {
  totalSales: string
  posReportedTotal: string | null
  posReportedRecordCount: number
  channelEntriesTotal: string
  varianceVsPosReportedTotal: string | null
  varianceVsChannelEntriesTotal: string
}

// A distinct, separately-surfaced calculation from SalesReconciliation
// above (ADR-0043) — that one compares totalSales/posReportedTotal/channel
// entries and never touches payment methods or cash; this one is entirely
// about physical cash on hand and never touches totalSales. Kept visually
// distinct in the UI, never merged into one number.
export interface CashReconciliation {
  physicalCashBasis: string
  cardElectronicTotal: string
  totalPaymentMethods: string
  manualDiscounts: string
  expectedCash: string
  actualCashCounted: string | null
  discrepancy: string | null
  status: CashReconciliationStatus
}

// Weekly rollup of the per-day cash reconciliation figures in dailySales[]
// (ADR-0043). totalActualCashCounted/totalDiscrepancy sum ONLY days that
// have a count (daysCounted) — a day with no count contributes nothing to
// either, so a week with missing counts never reads as a phantom shortfall.
export interface CashReconciliationSummary {
  totalManualDiscounts: string
  totalPhysicalCashBasis: string
  totalExpectedCash: string
  totalActualCashCounted: string
  totalDiscrepancy: string
  daysCounted: number
  daysBalanced: number
  daysShort: number
  daysOver: number
  daysNotCounted: number
}

export interface WeeklySalesSummary {
  branchId: string
  startDate: string
  endDate: string
  totalSales: string
  discountsTotal: string
  vouchersAmount: string
  vouchersCount: number
  coverage: SalesDataCoverage
  reconciliation: SalesReconciliation
  cashReconciliationSummary: CashReconciliationSummary
  dailySales: DailySalesTotal[]
  channelTotals: ChannelTotal[]
  posSourceTotals: PosSourceTotal[]
  channelsByPosSource: PosSourceChannelBreakdown[]
  paymentMethodTotals: PaymentMethodTotal[]
  paymentMethodPosSourceTotals: PaymentMethodPosSourceTotal[]
  paymentMethodsByPosSource: PosSourcePaymentMethodBreakdown[]
  categoryTotals: CategoryTotal[]
  topItems: TopItem[]
}

// changePercent is null (not an invalid/infinite value) when the previous
// period's value is zero — "no comparison data" is a distinct state from
// "0% change" (spec §C).
export interface SalesComparisonEntry {
  key: string
  label: string
  current: string
  previous: string
  change: string
  changePercent: string | null
}

// Both periods are supplied explicitly by the caller — never inferred by
// the backend.
export interface SalesComparison {
  branchId: string
  current: WeeklySalesSummary
  previous: WeeklySalesSummary
  totalSalesComparison: SalesComparisonEntry
  channelComparison: SalesComparisonEntry[]
  categoryComparison: SalesComparisonEntry[]
  topItemsComparison: SalesComparisonEntry[]
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}
