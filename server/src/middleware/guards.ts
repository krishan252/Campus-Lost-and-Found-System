import type {Request, Response, NextFunction} from 'express';
import { prisma } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { sessionCookie, verifySession } from '../lib/auth.js';
import { env } from '../lib/env.js';
import multer from 'multer';
import type {Role} from '@prisma/client';

declare global {
  namespace Express {
    interface Request { user?: {id:string; email:string; fullName:string; role:Role} }
  }
}
export async function requireAuth(req:Request,_res:Response,next:NextFunction) {
  try {
    const raw = req.cookies?.[sessionCookie];
    if (typeof raw !== 'string') throw new ApiError(401, 'Please sign in.');
    let session;
    try { session = verifySession(raw); } catch { throw new ApiError(401, 'Session expired. Please sign in again.'); }
    const user = await prisma.user.findUnique({where:{id:session.sub}});
    if (!user || !user.emailVerifiedAt || user.sessionVersion !== session.sv) throw new ApiError(401, 'Session is no longer valid.');
    req.user = {id:user.id,email:user.email,fullName:user.fullName,role:user.role};
    next();
  } catch(e) { next(e); }
}
export function requireAdmin(req:Request,_res:Response,next:NextFunction) {
  if (req.user?.role !== 'ADMIN') return next(new ApiError(403, 'Administrator access required.'));
  next();
}
export function checkOrigin(req:Request,_res:Response,next:NextFunction) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  // Origin is automatically sent by browsers for cross-origin writes. Reject untrusted origins.
  if (origin && origin !== env.CLIENT_URL) return next(new ApiError(403,'Request origin not allowed.'));
  next();
}
export function errorHandler(err:unknown,_req:Request,res:Response,_next:NextFunction) {
  if (err instanceof multer.MulterError) return res.status(400).json({success:false,message:err.code==='LIMIT_FILE_SIZE'?'Image exceeds 5 MB.':'Invalid image upload.'});
  if (err instanceof ApiError) return res.status(err.status).json({success:false,message:err.message});
  if (typeof err === 'object' && err !== null && 'name' in err && err.name === 'ZodError') return res.status(400).json({success:false,message:'Please check your form data.',details:err});
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2003') return res.status(400).json({success:false,message:'Selected category or location does not exist.'});
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') return res.status(409).json({success:false,message:'A record with these details already exists.'});
  console.error('Unhandled API error:', err);
  return res.status(500).json({success:false,message:'Something went wrong. Please try again.'});
}
