import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/env.js';

const prisma = new PrismaClient();
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
