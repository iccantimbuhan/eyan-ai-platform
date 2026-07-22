import { prisma } from '../lib/prisma.js'

const roleInclude = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } },
} as const

export class RoleRepository {
  findMany() {
    return prisma.role.findMany({ include: roleInclude, orderBy: { createdAt: 'desc' } })
  }

  findById(id: string) {
    return prisma.role.findUnique({ where: { id }, include: roleInclude })
  }

  findByName(name: string) {
    return prisma.role.findUnique({ where: { name } })
  }

  findPermissionsByNames(names: string[]) {
    return prisma.permission.findMany({ where: { name: { in: names } } })
  }

  findPermissions() {
    return prisma.permission.findMany({ orderBy: { name: 'asc' } })
  }

  async create(data: { name: string; description?: string; isActive?: boolean; permissionIds: string[] }) {
    return prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        permissions: { create: data.permissionIds.map((permissionId) => ({ permissionId })) },
      },
      include: roleInclude,
    })
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    return prisma.role.update({ where: { id }, data, include: roleInclude })
  }

  async replacePermissions(id: string, permissionIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } })
      if (permissionIds.length) {
        await tx.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })) })
      }
      return tx.role.findUniqueOrThrow({ where: { id }, include: roleInclude })
    })
  }

  delete(id: string) {
    return prisma.role.delete({ where: { id } })
  }
}

export const roleRepository = new RoleRepository()
