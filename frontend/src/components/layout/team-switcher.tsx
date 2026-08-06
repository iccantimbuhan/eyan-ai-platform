import { Building2, ChevronsUpDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useTenantContext } from '@/features/organizations/hooks/use-tenant-context'
import { useTenantStore } from '@/stores/tenant-store'

// Sprint 0 (ADR-0025) — real Organization/Restaurant/Branch data from
// GET /organizations/me, replacing the previous static `teams` prop.
// Selecting a coarser level (Organization) clears anything selected below
// it (see tenant-store.ts) so a stale Branch selection from a previously
// active Restaurant can never silently persist.
export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { data: organizations } = useTenantContext()

  const activeOrganizationId = useTenantStore(
    (state) => state.tenant.activeOrganizationId
  )
  const activeRestaurantId = useTenantStore(
    (state) => state.tenant.activeRestaurantId
  )
  const activeBranchId = useTenantStore((state) => state.tenant.activeBranchId)
  const setActiveOrganization = useTenantStore(
    (state) => state.tenant.setActiveOrganization
  )
  const setActiveRestaurant = useTenantStore(
    (state) => state.tenant.setActiveRestaurant
  )
  const setActiveBranch = useTenantStore((state) => state.tenant.setActiveBranch)

  if (!organizations || organizations.length === 0) {
    return null
  }

  const activeOrganization =
    organizations.find((organization) => organization.id === activeOrganizationId) ??
    organizations[0]

  const activeRestaurant = activeOrganization.restaurants.find(
    (restaurant) => restaurant.id === activeRestaurantId
  )
  const activeBranch = activeRestaurant?.branches.find(
    (branch) => branch.id === activeBranchId
  )

  const restaurantCount = activeOrganization.restaurants.length
  const subtitle =
    activeBranch?.name ??
    activeRestaurant?.name ??
    `${restaurantCount} restaurant${restaurantCount === 1 ? '' : 's'}`

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                <Building2 className='size-4' />
              </div>
              <div className='grid flex-1 text-start text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {activeOrganization.name}
                </span>
                <span className='truncate text-xs'>{subtitle}</span>
              </div>
              <ChevronsUpDown className='ms-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Organizations
            </DropdownMenuLabel>
            {organizations.map((organization) => (
              <DropdownMenuItem
                key={organization.id}
                onClick={() => setActiveOrganization(organization.id)}
                className='gap-2 p-2'
              >
                <div className='flex size-6 items-center justify-center rounded-sm border'>
                  <Building2 className='size-4 shrink-0' />
                </div>
                {organization.name}
              </DropdownMenuItem>
            ))}

            {activeOrganization.restaurants.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className='text-xs text-muted-foreground'>
                  Restaurants
                </DropdownMenuLabel>
                {activeOrganization.restaurants.map((restaurant) => (
                  <DropdownMenuItem
                    key={restaurant.id}
                    onClick={() => setActiveRestaurant(restaurant.id)}
                    className='gap-2 p-2'
                  >
                    {restaurant.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {activeRestaurant && activeRestaurant.branches.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className='text-xs text-muted-foreground'>
                  Branches
                </DropdownMenuLabel>
                {activeRestaurant.branches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.id}
                    onClick={() => setActiveBranch(branch.id)}
                    className='gap-2 p-2'
                  >
                    {branch.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
