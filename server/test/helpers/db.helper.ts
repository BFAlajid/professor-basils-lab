import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: { url: process.env['DATABASE_URL_TEST'] ?? process.env['DATABASE_URL'] },
      },
    });
  }
  return prismaInstance;
}

export async function cleanDb(prisma: PrismaClient): Promise<void> {
  // Order matters: FK constraints require children before parents
  await prisma.session.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
}
