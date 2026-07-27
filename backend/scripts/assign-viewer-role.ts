import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const email = "iccantimbuhan@gmail.com";

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const viewerRole = await prisma.role.findUnique({
    where: { name: "Viewer" },
  });

  if (!viewerRole) {
    throw new Error("Viewer role not found. Run pnpm db:seed first.");
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: viewerRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: viewerRole.id,
    },
  });

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  console.dir(updated, { depth: null });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
