import { ConflictError, NotFoundError } from '../errors/auth.error.js'
import type { CreateRoleDto, RoleResponseDto, UpdateRoleDto } from '../dto/role.dto.js'
import { roleRepository } from '../repositories/role.repository.js'

function toRoleResponse(role: any): RoleResponseDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isActive: role.isActive,
    userCount: role._count.users,
    permissions: role.permissions.map((item: any) => item.permission.name),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }
}

export class RolesService {
  async getRoles() { return (await roleRepository.findMany()).map(toRoleResponse) }
  getPermissions() { return roleRepository.findPermissions() }

  async createRole(dto: CreateRoleDto) {
    if (await roleRepository.findByName(dto.name)) throw new ConflictError('A role with this name already exists.')
    const permissionIds = await this.resolvePermissionIds(dto.permissions ?? [])
    return toRoleResponse(await roleRepository.create({ ...dto, permissionIds }))
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.requireRole(id)
    if (dto.name && dto.name !== role.name && await roleRepository.findByName(dto.name)) throw new ConflictError('A role with this name already exists.')
    const updated = await roleRepository.update(id, { name: dto.name, description: dto.description, isActive: dto.isActive })
    return dto.permissions ? toRoleResponse(await roleRepository.replacePermissions(id, await this.resolvePermissionIds(dto.permissions))) : toRoleResponse(updated)
  }

  async updateRolePermissions(id: string, permissions: string[]) {
    await this.requireRole(id)
    return toRoleResponse(await roleRepository.replacePermissions(id, await this.resolvePermissionIds(permissions)))
  }

  async deleteRole(id: string) {
    await this.requireRole(id)
    await roleRepository.delete(id)
  }

  private async requireRole(id: string) {
    const role = await roleRepository.findById(id)
    if (!role) throw new NotFoundError('Role not found.')
    return role
  }

  private async resolvePermissionIds(names: string[]) {
    const permissions = await roleRepository.findPermissionsByNames(names)
    if (permissions.length !== names.length) throw new NotFoundError('One or more permissions do not exist.')
    return permissions.map((permission) => permission.id)
  }
}

export const rolesService = new RolesService()
