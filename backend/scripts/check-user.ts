import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const user = await prisma.user.findUnique({
    where: {
      email: "iccantimbuhan@gmail.com",
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  console.dir(user, { depth: null });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
