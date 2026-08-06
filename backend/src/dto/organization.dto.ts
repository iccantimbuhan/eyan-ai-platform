export interface BranchSummaryDto {
  id: string;
  name: string;
}

export interface RestaurantSummaryDto {
  id: string;
  name: string;
  branches: BranchSummaryDto[];
}

export interface OrganizationSummaryDto {
  id: string;
  name: string;
  restaurants: RestaurantSummaryDto[];
  enabledModules: string[];
}

export type TenantContextResponseDto = OrganizationSummaryDto[];
