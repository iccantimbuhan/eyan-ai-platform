import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const email = "iccantimbuhan@gmail.com";

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) throw new Error("User not found");

  const ownerRole = await prisma.role.findUnique({
    where: { name: "Owner" },
  });

  if (!ownerRole) throw new Error("Owner role not found");

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: ownerRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: ownerRole.id,
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
