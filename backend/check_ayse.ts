import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const ayse = await prisma.user.findFirst({ where: { email: 'ayse@demo.com' } });
  console.log(ayse);
}
main().finally(() => prisma.$disconnect());
