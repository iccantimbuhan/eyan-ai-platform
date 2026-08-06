import type { PrismaClient } from '../src/generated/prisma/client'

const ORGANIZATION_NAME = "Burger's Ink & Topo Gigio"
const DEFAULT_BRANCH_NAME = 'Main Branch'
const RESTAURANT_NAMES = ["Burger's Ink", 'Topo Gigio Pizzeria'] as const

// Restaurant Operations Platform tenancy foundation (ADR-0025, ADR-0026).
// Platform-required bootstrap data, not demo/sample content — safe and
// required to run against any environment, including production, on every
// deploy (see bootstrap.ts, .context/deployment.md). Seeds the one real
// Organization this platform serves today, owning both real restaurant
// brands, each with one default Branch (a real second/third Branch is
// created via Sprint 1's admin UI, not guessed here), with the "restaurant"
// module enabled for that Organization.
//
// Membership is granted to every user who already holds the platform's
// global "Owner" role, rather than a fake placeholder account — whoever is
// Owner in a given environment automatically gets tenant access. This is
// what a fresh deploy was actually missing (see the Sprint 0 finalization
// investigation): the Organization/Restaurant/Branch/OrganizationModule
// tables existed after migration, but this function had never run in
// production, so no Owner user had an OrganizationMember row and the
// "restaurant" Permission itself didn't exist yet either (see bootstrap.ts).
//
// Idempotent: every write is an upsert or a find-or-create; safe to run
// repeatedly against an already-seeded database.
export async function seedRestaurantTenancyFoundation(prisma: PrismaClient) {
  const existingOrganization = await prisma.organization.findFirst({
    where: { name: ORGANIZATION_NAME },
  })
  const organization =
    existingOrganization ??
    (await prisma.organization.create({ data: { name: ORGANIZATION_NAME } }))

  await prisma.organizationModule.upsert({
    where: {
      organizationId_moduleKey: {
        organizationId: organization.id,
        moduleKey: 'restaurant',
      },
    },
    update: { enabled: true },
    create: {
      organizationId: organization.id,
      moduleKey: 'restaurant',
      enabled: true,
    },
  })

  for (const name of RESTAURANT_NAMES) {
    const existingRestaurant = await prisma.restaurant.findFirst({
      where: { organizationId: organization.id, name },
    })
    const restaurant =
      existingRestaurant ??
      (await prisma.restaurant.create({
        data: { organizationId: organization.id, name },
      }))

    const existingBranch = await prisma.branch.findFirst({
      where: { restaurantId: restaurant.id, name: DEFAULT_BRANCH_NAME },
    })

    if (!existingBranch) {
      await prisma.branch.create({
        data: { restaurantId: restaurant.id, name: DEFAULT_BRANCH_NAME },
      })
    }
  }

  const ownerRole = await prisma.role.findUnique({ where: { name: 'Owner' } })

  if (ownerRole) {
    const ownerUsers = await prisma.userRole.findMany({
      where: { roleId: ownerRole.id },
      select: { userId: true },
    })

    for (const { userId } of ownerUsers) {
      await prisma.organizationMember.upsert({
        where: {
          userId_organizationId: { userId, organizationId: organization.id },
        },
        update: { role: 'OWNER' },
        create: { userId, organizationId: organization.id, role: 'OWNER' },
      })
    }
  }
}
