import type { PrismaClient } from '../src/generated/prisma/client'
import { hashPassword } from '../src/utils/password'

// Placeholder seed account for the real restaurant manager — same posture
// as seed.ts's DEMO_USER_*, not a real production credential. Replace with
// the actual manager's own account once Sprint 1 ships membership
// management in the admin UI.
const MANAGER_EMAIL = 'manager@eyan-restaurants.dev'
const MANAGER_PASSWORD = 'RestaurantManager!2026'
const MANAGER_NAME = 'Restaurant Manager'

const ORGANIZATION_NAME = "Burger's Ink & Topo Gigio"
const RESTAURANT_NAMES = ["Burger's Ink", 'Topo Gigio Pizzeria'] as const

// Sprint 0 — Restaurant Operations Platform tenancy foundation (ADR-0025,
// ADR-0026). Seeds the real business this module is built for: one
// Organization owning both restaurant brands, the manager granted
// OrganizationMember (access to both restaurants, matching how they run
// the business today), and the "restaurant" module enabled for that
// Organization. No Branch is seeded — branches are real physical
// locations; none has been confirmed as multi-location yet, so none is
// guessed here. Idempotent: safe to run against an already-seeded database.
export async function seedRestaurantTenancyFoundation(prisma: PrismaClient) {
  const existingManager = await prisma.user.findUnique({
    where: { email: MANAGER_EMAIL },
  })
  const manager =
    existingManager ??
    (await prisma.user.create({
      data: {
        name: MANAGER_NAME,
        email: MANAGER_EMAIL,
        passwordHash: await hashPassword(MANAGER_PASSWORD),
        emailVerified: true,
      },
    }))

  const existingOrganization = await prisma.organization.findFirst({
    where: { name: ORGANIZATION_NAME },
  })
  const organization =
    existingOrganization ??
    (await prisma.organization.create({ data: { name: ORGANIZATION_NAME } }))

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: manager.id,
        organizationId: organization.id,
      },
    },
    update: { role: 'OWNER' },
    create: { userId: manager.id, organizationId: organization.id, role: 'OWNER' },
  })

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

    if (!existingRestaurant) {
      await prisma.restaurant.create({
        data: { organizationId: organization.id, name },
      })
    }
  }
}
