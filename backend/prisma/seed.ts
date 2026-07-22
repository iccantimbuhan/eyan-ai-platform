import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const roles = [
  { name: 'Owner', description: 'Full system owner' },
  { name: 'Admin', description: 'System administrator' },
  { name: 'Developer', description: 'Software developer' },
  { name: 'QA Engineer', description: 'Quality Assurance' },
  { name: 'Viewer', description: 'Read-only user' },
]

// Page-level permissions. Granular keys can be added later without a schema change.
const permissions = [
  ['dashboard', 'View the dashboard'], ['chat', 'Use AI Chat'], ['models', 'View models'],
  ['conversations', 'View conversations'], ['users', 'Access users'], ['roles', 'Access roles'],
  ['providers', 'Access AI providers'], ['settings', 'Access settings'], ['apikeys', 'Access API keys'],
  ['analytics', 'View analytics'], ['auditlogs', 'View audit logs'],
] as const

async function main() {
  for (const role of roles) await prisma.role.upsert({ where: { name: role.name }, update: {}, create: role })
  for (const [name, description] of permissions) await prisma.permission.upsert({ where: { name }, update: { description }, create: { name, description } })
  const owner = await prisma.role.findUniqueOrThrow({ where: { name: 'Owner' } })
  for (const [name] of permissions) {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { name } })
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: owner.id, permissionId: permission.id } }, update: {}, create: { roleId: owner.id, permissionId: permission.id } })
  }
}
main().catch((error) => { console.error(error); process.exit(1) }).finally(() => prisma.$disconnect())
