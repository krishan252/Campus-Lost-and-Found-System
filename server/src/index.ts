import { createApp } from './app.js';
import { env } from './env.js';
import { MemoryRepository } from './memoryRepository.js';

const server = createApp(new MemoryRepository()).listen(env.PORT, () => {
  console.log(`Campus Lost and Found API listening on http://localhost:${env.PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
