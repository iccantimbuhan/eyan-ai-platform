import type { TenantRole } from "../generated/prisma/enums.js";

export interface BranchSummaryDto {
  id: string;
  name: string;
  // Display-only; see mapTenantContextToResponse's comment. Never the real
  // enforcement — requireTenantRole is.
  myRole: TenantRole | null;
}

export interface RestaurantSummaryDto {
  id: string;
  name: string;
  branches: BranchSummaryDto[];
  myRole: TenantRole | null;
}

export interface OrganizationSummaryDto {
  id: string;
  name: string;
  restaurants: RestaurantSummaryDto[];
  enabledModules: string[];
  myRole: TenantRole | null;
}

export type TenantContextResponseDto = OrganizationSummaryDto[];
