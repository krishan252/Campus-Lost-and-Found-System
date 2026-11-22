import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const categories = ['Electronics', 'ID cards', 'Keys', 'Bags', 'Books & notes', 'Clothing', 'Other'];
const locations = ['Lecture halls', 'Engineering library', 'Canteen', 'Laboratories', 'Computer center', 'Main entrance', 'Sports ground', 'Faculty common area', 'Other'];
async function main() {
  for (const name of categories) await prisma.itemCategory.upsert({where: {name}, update: {}, create: {name}});
  for (const name of locations) await prisma.campusLocation.upsert({where: {name}, update: {}, create: {name}});
  const email = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error('DEMO_ADMIN_PASSWORD must have at least 12 characters');
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({where: {email}, update: {role: Role.ADMIN, emailVerifiedAt: new Date(), passwordHash}, create: {email, fullName: 'Demo Administrator', passwordHash, role: Role.ADMIN, emailVerifiedAt: new Date()}});
    console.log(`Demo admin ready: ${email}`);
  } else console.log('No demo admin created. Set DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD in server/.env then run seed.');
  console.log('Category/location seed complete.');
}
main().catch(e => {console.error(e); process.exitCode = 1;}).finally(() => prisma.$disconnect());
