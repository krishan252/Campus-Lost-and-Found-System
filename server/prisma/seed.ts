import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';
import bcrypt from 'bcryptjs';
import { env } from '../src/env.js';

const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL must be configured before seeding the database.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const categories = ['Electronics & Laptops', 'Wallets, IDs & Cards', 'Keys', 'Books & Stationery', 'Clothing & Accessories', 'Other'];
const locations = ['Central Library', 'Engineering Complex', 'Student Activity Centre', 'Science Laboratories', 'Sports Ground', 'Other'];

async function seed() {
  await Promise.all([
    ...categories.map(name => prisma.itemCategory.upsert({ where: { name }, update: {}, create: { name } })),
    ...locations.map(name => prisma.campusLocation.upsert({ where: { name }, update: {}, create: { name } }))
  ]);
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    await prisma.user.upsert({
      where: { email: env.ADMIN_EMAIL.toLowerCase() },
      update: { role: Role.ADMIN, passwordHash },
      create: {
        fullName: 'Campus Administrator',
        email: env.ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: Role.ADMIN
      }
    });
  }
  console.log('Seeded campus categories and locations.');
}

seed()
  .catch(error => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
