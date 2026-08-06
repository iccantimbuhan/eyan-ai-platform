import { api } from '@/services/api'

export interface BranchSummary {
  id: string
  name: string
}

export interface RestaurantSummary {
  id: string
  name: string
  branches: BranchSummary[]
}

export interface OrganizationSummary {
  id: string
  name: string
  restaurants: RestaurantSummary[]
  enabledModules: string[]
}

export async function getTenantContext() {
  const { data } = await api.get<{ data: OrganizationSummary[] }>(
    '/organizations/me'
  )

  return data.data
}
