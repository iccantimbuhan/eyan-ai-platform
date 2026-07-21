import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const roles = [
  {
    name: "Owner",
    description: "Full system owner",
  },
  {
    name: "Admin",
    description: "System administrator",
  },
  {
    name: "Developer",
    description: "Software developer",
  },
  {
    name: "QA Engineer",
    description: "Quality Assurance",
  },
  {
    name: "Viewer",
    description: "Read-only user",
  },
];

const permissions = [
  "users.create",
  "users.read",
  "users.update",
  "users.delete",
  "roles.manage",
  "permissions.manage",
  "dashboard.read",
  "profile.read",
  "audit.read",
  "deployments.create",
  "deployments.read",
  "api.manage",
];

async function main() {
  console.log("🌱 Seeding RBAC...");

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission },
      update: {},
      create: {
        name: permission,
      },
    });
  }

  console.log("✅ Roles seeded");
  console.log("✅ Permissions seeded");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
