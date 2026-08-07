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

export interface ApiResponse<T> {
  success: boolean
  data: T
}
