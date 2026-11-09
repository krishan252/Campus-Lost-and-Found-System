import 'dotenv/config';
import { z } from 'zod';

const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional()
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && !value.JWT_SECRET) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'], message: 'JWT_SECRET is required in production.' });
  }
  if (Boolean(value.ADMIN_EMAIL) !== Boolean(value.ADMIN_PASSWORD)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['ADMIN_EMAIL', 'ADMIN_PASSWORD'], message: 'Configure both admin credentials or neither.' });
  }
});

export const env = environment.parse(process.env);
export const jwtSecret = env.JWT_SECRET ?? 'local-development-secret-change-before-deploy';
