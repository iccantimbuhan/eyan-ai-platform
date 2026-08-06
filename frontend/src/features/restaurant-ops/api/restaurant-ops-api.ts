import { api } from '@/services/api'
import type {
  ApiResponse,
  Branch,
  Ingredient,
  IngredientCategory,
  MenuCategory,
  MenuItem,
  MenuItemStatus,
  Recipe,
  RecipeIngredientLine,
  Restaurant,
  StaffMember,
  StaffMembershipScope,
  Supplier,
  TenantRole,
  Unit,
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
