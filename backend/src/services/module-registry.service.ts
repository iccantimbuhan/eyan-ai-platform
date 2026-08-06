import {
  organizationModuleRepository,
  OrganizationModuleRepository,
} from "../repositories/organization-module.repository.js";

export class ModuleRegistryService {
  constructor(
    private readonly repository: OrganizationModuleRepository = organizationModuleRepository
  ) {}

  // Enabled module keys per Organization, for the given ids. Used only to
  // build the "enabledModules" list a user's tenant context exposes to the
  // frontend for nav-visibility gating — never for RBAC enforcement.
  async enabledModuleKeysByOrganization(
    organizationIds: string[]
  ): Promise<Map<string, string[]>> {
    const rows =
      await this.repository.findEnabledByOrganizationIds(organizationIds);

    const byOrganization = new Map<string, string[]>();

    for (const row of rows) {
      const keys = byOrganization.get(row.organizationId) ?? [];
      keys.push(row.moduleKey);
      byOrganization.set(row.organizationId, keys);
    }

    return byOrganization;
  }

  async setEnabled(organizationId: string, moduleKey: string, enabled: boolean) {
    return this.repository.upsert({ organizationId, moduleKey, enabled });
  }
}

export const moduleRegistryService = new ModuleRegistryService();
