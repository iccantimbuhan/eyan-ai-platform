import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { seedRestaurantTenancyFoundation } from './seed-restaurant-tenancy'

// Platform-required bootstrap data — roles, permissions, and the Restaurant
// Operations tenancy foundation. Deliberately separate from seed.ts's
// demo/sample content (portfolio demo account, demo Content Studio
// project, prompt template library): this is the subset that is safe and
// required to run against ANY environment, including production, on every
// deploy — see deploy.sh and .context/deployment.md. Every write here is an
// upsert or a find-or-create; running this twice against the same database
// changes nothing the second time.
//
// This is exactly the gap that left the Restaurant Operations sidebar
// hidden after the Sprint 0 deploy: `prisma migrate deploy` created the
// tenancy tables, but nothing populated the "restaurant" Permission row or
// granted any Organization membership, because seeding has only ever been
// a manual, easy-to-forget step. `bootstrapPlatform()` closes that gap by
// being the one thing deploy.sh runs automatically; seed.ts (full local/dev
// setup) calls it too, so there is exactly one implementation of "what
// bootstrap means," never two.
const roles = [
  { name: 'Owner', description: 'Full system owner' },
  { name: 'Admin', description: 'System administrator' },
  { name: 'Developer', description: 'Software developer' },
  { name: 'QA Engineer', description: 'Quality Assurance' },
  { name: 'Viewer', description: 'Read-only user' },
] as const

// Page-level permissions. Granular keys can be added later without a schema change.
const permissions = [
  ['dashboard', 'View the dashboard'], ['chat', 'Use AI Chat'], ['models', 'View models'],
  ['conversations', 'View conversations'], ['users', 'Access users'], ['roles', 'Access roles'],
  ['providers', 'Access AI providers'], ['settings', 'Access settings'], ['apikeys', 'Access API keys'],
  ['analytics', 'View analytics'], ['auditlogs', 'View audit logs'],
  ['automation', 'Access the MCP automation foundation'],
  ['automationcredentials', 'Manage automation connection credentials'],
  ['finance', 'Access Finance Management'],
  ['presentation-engine', 'Access the Presentation Engine'],
  ['crm', 'Access the CRM (leads, pipeline)'],
  ['aicore', 'Access the AI Core platform (Capabilities, Brains, Providers, Playground, Usage)'],
  ['aicoreadmin', 'Administer AI Core (create/edit Brains and Capabilities, manage provider credentials, routing policies, prompts, and the Playground)'],
  ['restaurant', 'Access Restaurant Operations'],
] as const

export async function bootstrapPlatform(prisma: PrismaClient) {
  for (const role of roles) {
    await prisma.role.upsert({ where: { name: role.name }, update: {}, create: role })
  }

  for (const [name, description] of permissions) {
    await prisma.permission.upsert({ where: { name }, update: { description }, create: { name, description } })
  }

  const owner = await prisma.role.findUniqueOrThrow({ where: { name: 'Owner' } })

  for (const [name] of permissions) {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { name } })
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: owner.id, permissionId: permission.id } },
      update: {},
      create: { roleId: owner.id, permissionId: permission.id },
    })
  }

  await seedRestaurantTenancyFoundation(prisma)
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

async function main() {
  await bootstrapPlatform(prisma)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
