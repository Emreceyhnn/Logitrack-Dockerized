/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, surname: true }
  });
  console.log("Users:", users);

  const subscriptions = await prisma.subscription.findMany();
  console.log("Subscriptions:", subscriptions);

  const demoRequests = await prisma.demoRequest.findMany();
  console.log("DemoRequests:", demoRequests);
}

main().catch(console.error).finally(() => prisma.$disconnect());
