import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from './env.js';
const cookieName = 'clfr_session';
export type SessionPayload = {sub: string; sv: number};
export function signSession(userId: string, version: number) {
  return jwt.sign({sv: version}, env.JWT_SECRET, {subject: userId, expiresIn: '12h', issuer: 'campus-lost-found', audience: 'clfr-web'});
}
export function verifySession(raw: string): SessionPayload {
  const payload = jwt.verify(raw, env.JWT_SECRET, {issuer: 'campus-lost-found', audience: 'clfr-web'});
  if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.sv !== 'number') throw new Error('Invalid session');
  return {sub: payload.sub, sv: payload.sv};
}
export function setSession(res: Response, token: string) {
  res.cookie(cookieName, token, {httpOnly:true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 12*60*60*1000, path:'/api'});
}
export function clearSession(res: Response) {
  res.clearCookie(cookieName, {httpOnly:true, secure: env.NODE_ENV === 'production', sameSite:'lax', path:'/api'});
}
export const sessionCookie = cookieName;
