import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Repository } from '../domain.js';
import { clearSession, requireAuth, setSession } from '../auth.js';
import { ApiError } from '../errors.js';

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(90),
  email: z.string().trim().email().max(160).transform(value => value.toLowerCase()),
  password: z.string().min(10).max(100)
});
const loginSchema = z.object({ email: z.string().trim().email().transform(value => value.toLowerCase()), password: z.string().min(1) });
const userView = (user: { id: string; fullName: string; email: string; role: string }) => ({
  id: user.id, fullName: user.fullName, email: user.email, role: user.role
});

export function authRouter(repository: Repository) {
  const router = Router();

  router.post('/register', async (req, res, next) => {
    try {
      const data = registerSchema.parse(req.body);
      if (await repository.findUserByEmail(data.email)) throw new ApiError(409, 'This email is already registered.');
      const user = await repository.createUser({
        ...data,
        passwordHash: await bcrypt.hash(data.password, 12)
      });
      setSession(res, user.id, user.role);
      res.status(201).json({ success: true, data: { user: userView(user) }, message: 'Account created.' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await repository.findUserByEmail(data.email);
      if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) throw new ApiError(401, 'Incorrect email or password.');
      setSession(res, user.id, user.role);
      res.json({ success: true, data: { user: userView(user) }, message: 'Logged in successfully.' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', requireAuth(repository), (_req, res) => {
    clearSession(res);
    res.json({ success: true, message: 'Logged out.' });
  });

  router.get('/me', requireAuth(repository), (req, res) => {
    res.json({ success: true, data: { user: req.user } });
  });

  return router;
}
