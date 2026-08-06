import { create } from 'zustand'
import { getCookie, removeCookie, setCookie } from '@/lib/cookies'

const ACTIVE_ORGANIZATION_ID = 'eyan_active_organization_id'
const ACTIVE_RESTAURANT_ID = 'eyan_active_restaurant_id'
const ACTIVE_BRANCH_ID = 'eyan_active_branch_id'

interface TenantState {
  tenant: {
    activeOrganizationId: string
    activeRestaurantId: string
    activeBranchId: string

    setActiveOrganization: (organizationId: string) => void
    setActiveRestaurant: (restaurantId: string) => void
    setActiveBranch: (branchId: string) => void
    reset: () => void
  }
}

// Sprint 0 (ADR-0025) — active Organization/Restaurant/Branch selection for
// TeamSwitcher. Persisted via the same manual-cookie approach as
// auth-store.ts, not zustand's persist middleware, to match this
// codebase's one existing persistence convention. Selecting a coarser
// level clears everything beneath it — a stale Branch selection from a
// previously active Restaurant would silently scope requests wrong
// otherwise.
export const useTenantStore = create<TenantState>()((set) => ({
  tenant: {
    activeOrganizationId: getCookie(ACTIVE_ORGANIZATION_ID) || '',
    activeRestaurantId: getCookie(ACTIVE_RESTAURANT_ID) || '',
    activeBranchId: getCookie(ACTIVE_BRANCH_ID) || '',

    setActiveOrganization: (organizationId) => {
      setCookie(ACTIVE_ORGANIZATION_ID, organizationId)
      removeCookie(ACTIVE_RESTAURANT_ID)
      removeCookie(ACTIVE_BRANCH_ID)

      set((state) => ({
        tenant: {
          ...state.tenant,
          activeOrganizationId: organizationId,
          activeRestaurantId: '',
          activeBranchId: '',
        },
      }))
    },

    setActiveRestaurant: (restaurantId) => {
      setCookie(ACTIVE_RESTAURANT_ID, restaurantId)
      removeCookie(ACTIVE_BRANCH_ID)

      set((state) => ({
        tenant: {
          ...state.tenant,
          activeRestaurantId: restaurantId,
          activeBranchId: '',
        },
      }))
    },

    setActiveBranch: (branchId) => {
      setCookie(ACTIVE_BRANCH_ID, branchId)

      set((state) => ({
        tenant: { ...state.tenant, activeBranchId: branchId },
      }))
    },

    reset: () => {
      removeCookie(ACTIVE_ORGANIZATION_ID)
      removeCookie(ACTIVE_RESTAURANT_ID)
      removeCookie(ACTIVE_BRANCH_ID)

      set((state) => ({
        tenant: {
          ...state.tenant,
          activeOrganizationId: '',
          activeRestaurantId: '',
          activeBranchId: '',
        },
      }))
    },
  },
}))
