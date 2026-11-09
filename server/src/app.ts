import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { ZodError } from 'zod';
import type { Repository } from './domain.js';
import { env } from './env.js';
import { ApiError } from './errors.js';
import { authRouter } from './routes/auth.js';
import { reportsRouter } from './routes/reports.js';
import { claimsRouter } from './routes/claims.js';
import { adminRouter } from './routes/admin.js';

export function createApp(repository: Repository) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use((req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if (origin && origin !== env.CLIENT_URL) return next(new ApiError(403, 'Request origin not allowed.'));
    }
    next();
  });
  app.get('/api/v1/health', async (_req, res, next) => {
    try {
      await repository.health();
      res.json({ success: true, data: { service: 'campus-lost-and-found', status: 'ok' } });
    } catch (error) {
      next(error);
    }
  });
  app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }), authRouter(repository));
  app.use('/api/v1/reports', reportsRouter(repository));
  app.use('/api/v1', claimsRouter(repository));
  app.use('/api/v1/admin', adminRouter(repository));
  app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ApiError) return res.status(error.status).json({ success: false, message: error.message });
    if (error instanceof ZodError) return res.status(400).json({ success: false, message: 'Please check your form data.', details: error.issues });
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'Image exceeds 5 MB.' });
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ success: false, message: 'Upload one image at a time.' });
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return res.status(409).json({ success: false, message: 'A record with these details already exists.' });
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 400 && 'type' in error && error.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, message: 'Request body must contain valid JSON.' });
    }
    console.error('Unhandled API error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  });
  return app;
}
