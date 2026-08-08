import { isAxiosError } from 'axios'
import { api } from '@/services/api'
import type {
  ApiResponse,
  Branch,
  DailySalesRecord,
  DailySalesRecordListItem,
  Ingredient,
  IngredientCategory,
  InventoryItem,
  MenuCategory,
  MenuItem,
  MenuItemStatus,
  PosReportType,
  Recipe,
  RecipeIngredientLine,
  Restaurant,
  SalesCategoryEntry,
  SalesChannelEntry,
  SalesItemEntry,
  SalesPaymentMethodEntry,
  SalesPaymentMethodReference,
  SalesReference,
  SalesSource,
  StaffMember,
  StaffMembershipScope,
  StockMovement,
  Supplier,
  TenantRole,
  Unit,
  WeeklySalesSummary,
  SalesComparison,
  SalesChannelMenuItem,
} from '../types/restaurant-ops'

// Restaurants — Organization-scoped (create/list live under
// /organizations/:organizationId/restaurants; single-Restaurant ops live
// under /restaurants/:restaurantId). See backend/src/routes/v1/
// organization-restaurants.routes.ts + restaurants.routes.ts.
export async function getRestaurants(organizationId: string): Promise<Restaurant[]> {
  const { data } = await api.get<ApiResponse<Restaurant[]>>(
    `/organizations/${organizationId}/restaurants`
  )
  return data.data
}

export async function createRestaurant(
  organizationId: string,
  payload: { name: string }
): Promise<Restaurant> {
  const { data } = await api.post<ApiResponse<Restaurant>>(
    `/organizations/${organizationId}/restaurants`,
    payload
  )
  return data.data
}

export async function updateRestaurant(
  restaurantId: string,
  payload: { name?: string }
): Promise<Restaurant> {
  const { data } = await api.patch<ApiResponse<Restaurant>>(
    `/restaurants/${restaurantId}`,
    payload
  )
  return data.data
}

export async function deleteRestaurant(restaurantId: string) {
  const { data } = await api.delete(`/restaurants/${restaurantId}`)
  return data
}

// Branches — Restaurant-scoped.
export async function getBranches(restaurantId: string): Promise<Branch[]> {
  const { data } = await api.get<ApiResponse<Branch[]>>(
    `/restaurants/${restaurantId}/branches`
  )
  return data.data
}

export async function createBranch(
  restaurantId: string,
  payload: { name: string }
): Promise<Branch> {
  const { data } = await api.post<ApiResponse<Branch>>(
    `/restaurants/${restaurantId}/branches`,
    payload
  )
  return data.data
}

export async function updateBranch(
  branchId: string,
  payload: { name?: string }
): Promise<Branch> {
  const { data } = await api.patch<ApiResponse<Branch>>(`/branches/${branchId}`, payload)
  return data.data
}

export async function deleteBranch(branchId: string) {
  const { data } = await api.delete(`/branches/${branchId}`)
  return data
}

// Menu Categories — Restaurant-scoped.
export async function getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
  const { data } = await api.get<ApiResponse<MenuCategory[]>>(
    `/restaurants/${restaurantId}/menu-categories`
  )
  return data.data
}

export async function createMenuCategory(
  restaurantId: string,
  payload: { name: string; displayOrder?: number }
): Promise<MenuCategory> {
  const { data } = await api.post<ApiResponse<MenuCategory>>(
    `/restaurants/${restaurantId}/menu-categories`,
    payload
  )
  return data.data
}

export async function updateMenuCategory(
  categoryId: string,
  payload: { name?: string; displayOrder?: number }
): Promise<MenuCategory> {
  const { data } = await api.patch<ApiResponse<MenuCategory>>(
    `/menu-categories/${categoryId}`,
    payload
  )
  return data.data
}

export async function deleteMenuCategory(categoryId: string) {
  const { data } = await api.delete(`/menu-categories/${categoryId}`)
  return data
}

// Menu Items — Restaurant-scoped, belong to one Menu Category.
export interface MenuItemPayload {
  menuCategoryId: string
  name: string
  description?: string
  price: string
  imagePath?: string
  available?: boolean
  status?: MenuItemStatus
}

export async function getMenuItems(
  restaurantId: string,
  menuCategoryId?: string
): Promise<MenuItem[]> {
  const { data } = await api.get<ApiResponse<MenuItem[]>>(
    `/restaurants/${restaurantId}/menu-items`,
    { params: menuCategoryId ? { menuCategoryId } : undefined }
  )
  return data.data
}

export async function createMenuItem(
  restaurantId: string,
  payload: MenuItemPayload
): Promise<MenuItem> {
  const { data } = await api.post<ApiResponse<MenuItem>>(
    `/restaurants/${restaurantId}/menu-items`,
    payload
  )
  return data.data
}

export async function updateMenuItem(
  itemId: string,
  payload: Partial<MenuItemPayload>
): Promise<MenuItem> {
  const { data } = await api.patch<ApiResponse<MenuItem>>(`/menu-items/${itemId}`, payload)
  return data.data
}

export async function deleteMenuItem(itemId: string) {
  const { data } = await api.delete(`/menu-items/${itemId}`)
  return data
}

// Restaurant Product Foundation (Sprint 1.3) — Units, Ingredient
// Categories, Suppliers, Ingredients, Recipes are all Restaurant-scoped.

// Units
export async function getUnits(restaurantId: string): Promise<Unit[]> {
  const { data } = await api.get<ApiResponse<Unit[]>>(`/restaurants/${restaurantId}/units`)
  return data.data
}

export async function createUnit(
  restaurantId: string,
  payload: { name: string; abbreviation: string }
): Promise<Unit> {
  const { data } = await api.post<ApiResponse<Unit>>(`/restaurants/${restaurantId}/units`, payload)
  return data.data
}

export async function updateUnit(
  unitId: string,
  payload: { name?: string; abbreviation?: string }
): Promise<Unit> {
  const { data } = await api.patch<ApiResponse<Unit>>(`/units/${unitId}`, payload)
  return data.data
}

export async function deleteUnit(unitId: string) {
  const { data } = await api.delete(`/units/${unitId}`)
  return data
}

// Ingredient Categories
export async function getIngredientCategories(restaurantId: string): Promise<IngredientCategory[]> {
  const { data } = await api.get<ApiResponse<IngredientCategory[]>>(
    `/restaurants/${restaurantId}/ingredient-categories`
  )
  return data.data
}

export async function createIngredientCategory(
  restaurantId: string,
  payload: { name: string }
): Promise<IngredientCategory> {
  const { data } = await api.post<ApiResponse<IngredientCategory>>(
    `/restaurants/${restaurantId}/ingredient-categories`,
    payload
  )
  return data.data
}

export async function updateIngredientCategory(
  categoryId: string,
  payload: { name?: string }
): Promise<IngredientCategory> {
  const { data } = await api.patch<ApiResponse<IngredientCategory>>(
    `/ingredient-categories/${categoryId}`,
    payload
  )
  return data.data
}

export async function deleteIngredientCategory(categoryId: string) {
  const { data } = await api.delete(`/ingredient-categories/${categoryId}`)
  return data
}

// Suppliers
export async function getSuppliers(restaurantId: string): Promise<Supplier[]> {
  const { data } = await api.get<ApiResponse<Supplier[]>>(`/restaurants/${restaurantId}/suppliers`)
  return data.data
}

export interface SupplierPayload {
  name: string
  phone?: string | null
  email?: string | null
  notes?: string | null
}

export async function createSupplier(
  restaurantId: string,
  payload: SupplierPayload
): Promise<Supplier> {
  const { data } = await api.post<ApiResponse<Supplier>>(
    `/restaurants/${restaurantId}/suppliers`,
    payload
  )
  return data.data
}

export async function updateSupplier(
  supplierId: string,
  payload: Partial<SupplierPayload>
): Promise<Supplier> {
  const { data } = await api.patch<ApiResponse<Supplier>>(`/suppliers/${supplierId}`, payload)
  return data.data
}

export async function deleteSupplier(supplierId: string) {
  const { data } = await api.delete(`/suppliers/${supplierId}`)
  return data
}

// Ingredients — supplierIds replaces the ingredient's full linked-supplier
// set on write, same posture as roles.service.ts's permissions replace.
export interface IngredientPayload {
  name: string
  ingredientCategoryId?: string | null
  supplierIds?: string[]
}

export async function getIngredients(restaurantId: string): Promise<Ingredient[]> {
  const { data } = await api.get<ApiResponse<Ingredient[]>>(
    `/restaurants/${restaurantId}/ingredients`
  )
  return data.data
}

export async function createIngredient(
  restaurantId: string,
  payload: IngredientPayload
): Promise<Ingredient> {
  const { data } = await api.post<ApiResponse<Ingredient>>(
    `/restaurants/${restaurantId}/ingredients`,
    payload
  )
  return data.data
}

export async function updateIngredient(
  ingredientId: string,
  payload: Partial<IngredientPayload>
): Promise<Ingredient> {
  const { data } = await api.patch<ApiResponse<Ingredient>>(
    `/ingredients/${ingredientId}`,
    payload
  )
  return data.data
}

export async function deleteIngredient(ingredientId: string) {
  const { data } = await api.delete(`/ingredients/${ingredientId}`)
  return data
}

// Recipes — one per Menu Item, plus its embedded ingredient lines.
export async function getRecipes(restaurantId: string): Promise<Recipe[]> {
  const { data } = await api.get<ApiResponse<Recipe[]>>(`/restaurants/${restaurantId}/recipes`)
  return data.data
}

export async function createRecipe(
  restaurantId: string,
  payload: { menuItemId: string; notes?: string | null }
): Promise<Recipe> {
  const { data } = await api.post<ApiResponse<Recipe>>(
    `/restaurants/${restaurantId}/recipes`,
    payload
  )
  return data.data
}

export async function updateRecipe(
  recipeId: string,
  payload: { notes?: string | null }
): Promise<Recipe> {
  const { data } = await api.patch<ApiResponse<Recipe>>(`/recipes/${recipeId}`, payload)
  return data.data
}

export async function deleteRecipe(recipeId: string) {
  const { data } = await api.delete(`/recipes/${recipeId}`)
  return data
}

export interface RecipeIngredientPayload {
  ingredientId: string
  unitId: string
  quantity: number
}

export async function createRecipeIngredient(
  recipeId: string,
  payload: RecipeIngredientPayload
): Promise<RecipeIngredientLine> {
  const { data } = await api.post<ApiResponse<RecipeIngredientLine>>(
    `/recipes/${recipeId}/ingredients`,
    payload
  )
  return data.data
}

export async function updateRecipeIngredient(
  recipeIngredientId: string,
  payload: Partial<RecipeIngredientPayload>
): Promise<RecipeIngredientLine> {
  const { data } = await api.patch<ApiResponse<RecipeIngredientLine>>(
    `/recipe-ingredients/${recipeIngredientId}`,
    payload
  )
  return data.data
}

export async function deleteRecipeIngredient(recipeIngredientId: string) {
  const { data } = await api.delete(`/recipe-ingredients/${recipeIngredientId}`)
  return data
}

// Inventory Foundation — Branch-scoped (Sprint 2A, ADR-0038). Create/list
// live under Branch, mirroring Ingredient/Recipe's own nested-under-parent
// pattern; single-item ops and the three write actions live under their
// own flat /inventory-items route file (mirrors /recipe-ingredients).
export interface CreateInventoryItemPayload {
  ingredientId: string
  unitId: string
  openingQuantity: number
  minimumQuantity: number
  reason?: string
}

export async function getInventoryItems(branchId: string): Promise<InventoryItem[]> {
  const { data } = await api.get<ApiResponse<InventoryItem[]>>(
    `/branches/${branchId}/inventory-items`
  )
  return data.data
}

export async function createInventoryItem(
  branchId: string,
  payload: CreateInventoryItemPayload
): Promise<InventoryItem> {
  const { data } = await api.post<ApiResponse<InventoryItem>>(
    `/branches/${branchId}/inventory-items`,
    payload
  )
  return data.data
}

export async function updateInventoryItem(
  inventoryItemId: string,
  payload: { minimumQuantity: number }
): Promise<InventoryItem> {
  const { data } = await api.patch<ApiResponse<InventoryItem>>(
    `/inventory-items/${inventoryItemId}`,
    payload
  )
  return data.data
}

export async function getStockMovements(inventoryItemId: string): Promise<StockMovement[]> {
  const { data } = await api.get<ApiResponse<StockMovement[]>>(
    `/inventory-items/${inventoryItemId}/movements`
  )
  return data.data
}

export async function createAdjustment(
  inventoryItemId: string,
  payload: { quantityDelta: number; reason: string }
): Promise<StockMovement> {
  const { data } = await api.post<ApiResponse<StockMovement>>(
    `/inventory-items/${inventoryItemId}/adjustments`,
    payload
  )
  return data.data
}

export async function createWaste(
  inventoryItemId: string,
  payload: { quantity: number; reason: string }
): Promise<StockMovement> {
  const { data } = await api.post<ApiResponse<StockMovement>>(
    `/inventory-items/${inventoryItemId}/waste`,
    payload
  )
  return data.data
}

export async function createStockCount(
  inventoryItemId: string,
  payload: { countedQuantity: number; reason?: string }
): Promise<StockMovement> {
  const { data } = await api.post<ApiResponse<StockMovement>>(
    `/inventory-items/${inventoryItemId}/stock-count`,
    payload
  )
  return data.data
}

// Sales Foundation — Branch-scoped (Sprint 2C, ADR-0039). Reference lists
// (channel/payment method/category) are Restaurant-scoped, create+list
// only, same posture as Unit. Daily sales record create/list/daily/weekly
// live under Branch, mirroring Inventory Item; single-record ops and the
// four line-entry types live under their own flat /sales route file.

export async function getSalesChannels(restaurantId: string): Promise<SalesReference[]> {
  const { data } = await api.get<ApiResponse<SalesReference[]>>(
    `/restaurants/${restaurantId}/sales-channels`
  )
  return data.data
}

export async function createSalesChannel(
  restaurantId: string,
  payload: { name: string }
): Promise<SalesReference> {
  const { data } = await api.post<ApiResponse<SalesReference>>(
    `/restaurants/${restaurantId}/sales-channels`,
    payload
  )
  return data.data
}

export async function getSalesPaymentMethods(restaurantId: string): Promise<SalesPaymentMethodReference[]> {
  const { data } = await api.get<ApiResponse<SalesPaymentMethodReference[]>>(
    `/restaurants/${restaurantId}/sales-payment-methods`
  )
  return data.data
}

export async function createSalesPaymentMethod(
  restaurantId: string,
  payload: { name: string; isCashEquivalent?: boolean }
): Promise<SalesPaymentMethodReference> {
  const { data } = await api.post<ApiResponse<SalesPaymentMethodReference>>(
    `/restaurants/${restaurantId}/sales-payment-methods`,
    payload
  )
  return data.data
}

// ADR-0043 — the only reference-list update in this sprint: retroactively
// flags an existing payment method as physical cash.
export async function updateSalesPaymentMethod(
  restaurantId: string,
  id: string,
  payload: { isCashEquivalent: boolean }
): Promise<SalesPaymentMethodReference> {
  const { data } = await api.patch<ApiResponse<SalesPaymentMethodReference>>(
    `/restaurants/${restaurantId}/sales-payment-methods/${id}`,
    payload
  )
  return data.data
}

export async function getSalesCategories(restaurantId: string): Promise<SalesReference[]> {
  const { data } = await api.get<ApiResponse<SalesReference[]>>(
    `/restaurants/${restaurantId}/sales-categories`
  )
  return data.data
}

export async function createSalesCategory(
  restaurantId: string,
  payload: { name: string }
): Promise<SalesReference> {
  const { data } = await api.post<ApiResponse<SalesReference>>(
    `/restaurants/${restaurantId}/sales-categories`,
    payload
  )
  return data.data
}

// POS Source / Sales Channel Flexibility — a fourth Restaurant-scoped
// reference list, same create+list shape as the three above. Deliberately
// no endpoint linking it to a SalesChannel; that relationship is captured
// per channel entry instead (see createChannelEntry's posSourceId below).
export async function getPosSources(restaurantId: string): Promise<SalesReference[]> {
  const { data } = await api.get<ApiResponse<SalesReference[]>>(
    `/restaurants/${restaurantId}/sales-pos-sources`
  )
  return data.data
}

export async function createPosSource(
  restaurantId: string,
  payload: { name: string }
): Promise<SalesReference> {
  const { data } = await api.post<ApiResponse<SalesReference>>(
    `/restaurants/${restaurantId}/sales-pos-sources`,
    payload
  )
  return data.data
}

export interface CreateDailySalesRecordPayload {
  businessDate: string
  source: SalesSource
  posReportType?: PosReportType
  posReportNumber?: string
  posReportedTotal?: number
  totalSales: number
  discountsTotal?: number
  vouchersAmount?: number
  vouchersCount?: number
  // Manager-entered physical cash count for the whole day (ADR-0043).
  actualCashCounted?: number
  // Which POS source discountsTotal is scoped to (ADR-0043 amendment).
  // null (or omitted) means "all POS sources" — the legacy/global behavior.
  discountPosSourceId?: string | null
  // How much of discountsTotal reduces physical cash (ADR-0043 second
  // amendment). null (or omitted) means "not configured" — the full
  // discountsTotal reduces cash, the legacy/global behavior.
  cashDiscountTotal?: number | null
  notes?: string
}

export async function getDailySalesRecords(branchId: string): Promise<DailySalesRecordListItem[]> {
  const { data } = await api.get<ApiResponse<DailySalesRecordListItem[]>>(
    `/branches/${branchId}/sales`
  )
  return data.data
}

export async function createDailySalesRecord(
  branchId: string,
  payload: CreateDailySalesRecordPayload
): Promise<DailySalesRecord> {
  const { data } = await api.post<ApiResponse<DailySalesRecord>>(
    `/branches/${branchId}/sales`,
    payload
  )
  return data.data
}

export async function getDailySales(branchId: string, date: string): Promise<DailySalesRecord | null> {
  try {
    const { data } = await api.get<ApiResponse<DailySalesRecord>>(
      `/branches/${branchId}/sales/daily`,
      { params: { date } }
    )
    return data.data
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

export async function getWeeklySalesSummary(
  branchId: string,
  startDate: string,
  endDate: string
): Promise<WeeklySalesSummary> {
  const { data } = await api.get<ApiResponse<WeeklySalesSummary>>(
    `/branches/${branchId}/sales/weekly`,
    { params: { startDate, endDate } }
  )
  return data.data
}

// Both periods are supplied explicitly by the caller — this never infers
// "the previous period" itself.
export async function getSalesComparison(
  branchId: string,
  currentStartDate: string,
  currentEndDate: string,
  previousStartDate: string,
  previousEndDate: string
): Promise<SalesComparison> {
  const { data } = await api.get<ApiResponse<SalesComparison>>(
    `/branches/${branchId}/sales/comparison`,
    { params: { currentStartDate, currentEndDate, previousStartDate, previousEndDate } }
  )
  return data.data
}

export async function getSalesRecord(salesId: string): Promise<DailySalesRecord> {
  const { data } = await api.get<ApiResponse<DailySalesRecord>>(`/sales/${salesId}`)
  return data.data
}

export async function updateDailySalesRecord(
  salesId: string,
  payload: Partial<CreateDailySalesRecordPayload>
): Promise<DailySalesRecord> {
  const { data } = await api.patch<ApiResponse<DailySalesRecord>>(`/sales/${salesId}`, payload)
  return data.data
}

export async function createChannelEntry(
  salesId: string,
  payload: { salesChannelId: string; amount: number; posSourceId?: string; transactionCount?: number }
): Promise<SalesChannelEntry> {
  const { data } = await api.post<ApiResponse<SalesChannelEntry>>(
    `/sales/${salesId}/channel-entries`,
    payload
  )
  return data.data
}

export async function deleteChannelEntry(salesId: string, entryId: string) {
  const { data } = await api.delete(`/sales/${salesId}/channel-entries/${entryId}`)
  return data
}

export async function createPaymentMethodEntry(
  salesId: string,
  payload: { salesPaymentMethodId: string; amount: number; posSourceId?: string; transactionCount?: number }
): Promise<SalesPaymentMethodEntry> {
  const { data } = await api.post<ApiResponse<SalesPaymentMethodEntry>>(
    `/sales/${salesId}/payment-method-entries`,
    payload
  )
  return data.data
}

export async function deletePaymentMethodEntry(salesId: string, entryId: string) {
  const { data } = await api.delete(`/sales/${salesId}/payment-method-entries/${entryId}`)
  return data
}

export async function createCategoryEntry(
  salesId: string,
  payload: { salesCategoryId: string; quantity?: number; amount: number }
): Promise<SalesCategoryEntry> {
  const { data } = await api.post<ApiResponse<SalesCategoryEntry>>(
    `/sales/${salesId}/category-entries`,
    payload
  )
  return data.data
}

export async function deleteCategoryEntry(salesId: string, entryId: string) {
  const { data } = await api.delete(`/sales/${salesId}/category-entries/${entryId}`)
  return data
}

export interface CreateItemEntryPayload {
  menuItemId?: string
  itemName: string
  categoryName?: string
  quantity: number
  amount: number
  // POS-reported %QT/%SALE — see SalesItemEntry's own comment. Optional.
  posQuantityPercent?: number
  posSalesPercent?: number
}

export async function createItemEntry(
  salesId: string,
  payload: CreateItemEntryPayload
): Promise<SalesItemEntry> {
  const { data } = await api.post<ApiResponse<SalesItemEntry>>(
    `/sales/${salesId}/item-entries`,
    payload
  )
  return data.data
}

export async function deleteItemEntry(salesId: string, entryId: string) {
  const { data } = await api.delete(`/sales/${salesId}/item-entries/${entryId}`)
  return data
}

// Sprint 2B Prep — channel-specific MenuItem price/availability overrides.
export async function getSalesChannelMenuItems(restaurantId: string): Promise<SalesChannelMenuItem[]> {
  const { data } = await api.get<ApiResponse<SalesChannelMenuItem[]>>(
    `/restaurants/${restaurantId}/sales-channel-menu-items`
  )
  return data.data
}

export async function upsertSalesChannelMenuItem(
  menuItemId: string,
  salesChannelId: string,
  payload: { price?: number | null; available?: boolean }
): Promise<SalesChannelMenuItem> {
  const { data } = await api.put<ApiResponse<SalesChannelMenuItem>>(
    `/menu-items/${menuItemId}/channel-prices/${salesChannelId}`,
    payload
  )
  return data.data
}

export async function deleteSalesChannelMenuItem(menuItemId: string, salesChannelId: string) {
  const { data } = await api.delete(`/menu-items/${menuItemId}/channel-prices/${salesChannelId}`)
  return data
}

// Staff Management — Organization-scoped (Sprint 1.2, ADR-0036). The
// backend also exposes a Restaurant-scoped equivalent
// (/restaurants/:restaurantId/staff) for a Manager who only holds
// RestaurantMember, not OrganizationMember — not wired up on the frontend
// yet, since Burger's Ink's pilot setup grants OrganizationMember to its
// Owner/Manager already; a future sprint can route a Restaurant-only
// Manager to that endpoint from their own Restaurant context.
export async function getStaff(organizationId: string): Promise<StaffMember[]> {
  const { data } = await api.get<ApiResponse<StaffMember[]>>(
    `/organizations/${organizationId}/staff`
  )
  return data.data
}

export interface UpsertStaffPayload {
  email: string
  name?: string
  password?: string
  tenantRole: TenantRole
  scope: StaffMembershipScope
  restaurantId?: string
  branchId?: string
}

export async function upsertStaff(
  organizationId: string,
  payload: UpsertStaffPayload
): Promise<StaffMember> {
  const { data } = await api.post<ApiResponse<StaffMember>>(
    `/organizations/${organizationId}/staff`,
    payload
  )
  return data.data
}

export async function disableStaff(organizationId: string, userId: string) {
  const { data } = await api.delete(`/organizations/${organizationId}/staff/${userId}`)
  return data
}
