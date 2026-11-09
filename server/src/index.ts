import { createApp } from './app.js';
import { env } from './env.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaRepository } from './prismaRepository.js';

const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL must be configured before starting the API.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const server = createApp(new PrismaRepository(prisma)).listen(env.PORT, () => {
  console.log(`Campus Lost and Found API listening on http://localhost:${env.PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  }));
}
