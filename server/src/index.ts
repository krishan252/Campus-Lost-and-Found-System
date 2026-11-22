import { app } from './app.js';
import { env } from './lib/env.js';
import { prisma } from './lib/db.js';
const server = app.listen(env.PORT,()=>console.log(`CLFR Sprint 1 API on http://localhost:${env.PORT}`));
async function shutdown() {server.close();await prisma.$disconnect();}
process.on('SIGTERM',()=>{shutdown().finally(()=>process.exit(0));});
process.on('SIGINT',()=>{shutdown().finally(()=>process.exit(0));});
