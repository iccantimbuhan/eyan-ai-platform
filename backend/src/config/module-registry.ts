// The in-code half of the Module Registry (ADR-0026). Declares every
// business module the platform knows about; the DB half (OrganizationModule)
// records which of these are enabled for a given Organization. Enabling an
// *existing* module for a new customer is a config row — no code change, no
// migration. Adding a genuinely new module (e.g. Retail) still requires
// code, same as it always has; this registry does not change that.
export interface ModuleDefinition {
  key: string;
  label: string;
  // RBAC permission that gates the module's actual requests — the registry
  // only gates nav/route *visibility*; requirePermission (and, for
  // Restaurant, requireRestaurantAccess/requireBranchAccess) remain the
  // real enforcement, always.
  permission: string;
}

export const MODULE_REGISTRY: readonly ModuleDefinition[] = [
  { key: "finance", label: "Finance Management", permission: "finance" },
  { key: "crm", label: "CRM", permission: "crm" },
  { key: "content-studio", label: "Content Studio", permission: "dashboard" },
  { key: "ai-core", label: "AI Core", permission: "aicore" },
  { key: "restaurant", label: "Restaurant Operations", permission: "restaurant" },
] as const;

export function findModuleDefinition(
  key: string
): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((module) => module.key === key);
}
