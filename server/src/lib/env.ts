import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  ALLOWED_EMAIL_DOMAINS: z.string().default('engug.ruh.ac.lk'),
  SMTP_HOST: z.string().optional(), SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.string().default('false'), SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(), SMTP_FROM: z.string().optional()
});
export const env = schema.parse(process.env);
export const allowedDomains = env.ALLOWED_EMAIL_DOMAINS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
export const isUniversityEmail = (address: string) => {
  const parts = address.trim().toLowerCase().split('@');
  return parts.length === 2 && allowedDomains.includes(parts[1]);
};
