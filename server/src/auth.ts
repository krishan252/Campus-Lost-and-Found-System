import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Repository, Role } from './domain.js';
import { ApiError } from './errors.js';
import { env, jwtSecret } from './env.js';

export const sessionCookie = 'clfr_session';
type SessionClaims = { sub: string; role: Role };
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; fullName: string; email: string; role: Role };
    }
  }
}

export function setSession(res: Response, userId: string, role: Role) {
  const token = jwt.sign({ sub: userId, role } satisfies SessionClaims, jwtSecret, { expiresIn: '7d' });
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearSession(res: Response) {
  res.clearCookie(sessionCookie, { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production' });
}

export function requireAuth(repository: Repository) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[sessionCookie];
      if (typeof token !== 'string') throw new ApiError(401, 'Please sign in.');
      let claims: SessionClaims;
      try {
        claims = jwt.verify(token, jwtSecret) as SessionClaims;
      } catch {
        throw new ApiError(401, 'Your session has expired. Please sign in again.');
      }
      const user = await repository.findUserById(claims.sub);
      if (!user) throw new ApiError(401, 'Your session is no longer valid.');
      req.user = { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') return next(new ApiError(403, 'Administrator access required.'));
  next();
}

export function canManageReport(req: Request, reporterId: string) {
  return req.user?.role === 'ADMIN' || req.user?.id === reporterId;
}
