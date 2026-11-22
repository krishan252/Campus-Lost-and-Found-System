import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { env, isUniversityEmail } from '../lib/env.js';
import { clearSession, setSession, signSession } from '../lib/auth.js';
import { requireAuth } from '../middleware/guards.js';

export const authRouter = Router();
const registerSchema = z.object({ fullName:z.string().trim().min(2).max(90), email:z.string().trim().email().max(160), password:z.string().min(10).max(100) });
const loginSchema = z.object({email:z.string().trim().email(),password:z.string().min(1)});
const emailSchema = z.object({email:z.string().trim().email()});
const userView = (u:{id:string;fullName:string;email:string;role:string}) => ({id:u.id,fullName:u.fullName,email:u.email,role:u.role});

async function sendVerification(userId:string,email:string):Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.emailVerificationToken.deleteMany({where:{userId}});
  await prisma.emailVerificationToken.create({data:{userId,tokenHash,expiresAt:new Date(Date.now()+30*60*1000)}});
  const url = `${env.CLIENT_URL}/verify?token=${token}`;
  if (!env.SMTP_HOST) {
    if (env.NODE_ENV === 'production') throw new ApiError(503,'Email delivery is not configured.');
    console.log(`\n[DEV ONLY] Verification link for ${email}:\n${url}\n`);
    return;
  }
  const transport = nodemailer.createTransport({
    host:env.SMTP_HOST, port:env.SMTP_PORT ?? 587, secure:env.SMTP_SECURE === 'true',
    auth:env.SMTP_USER ? {user:env.SMTP_USER, pass:env.SMTP_PASS ?? ''} : undefined
  });
  await transport.sendMail({from:env.SMTP_FROM || 'noreply@example.org',to:email,subject:'Verify your Campus Lost & Found email',text:`Open this link to verify your account (valid for 30 minutes):\n${url}`});
}

authRouter.post('/register',async(req,res,next)=>{
  try {
    if (env.NODE_ENV === 'production' && !env.SMTP_HOST) throw new ApiError(503,'Registration is unavailable until email delivery is configured.');
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase();
    if (!isUniversityEmail(email)) throw new ApiError(400,'Use an approved University of Ruhuna email address.');
    if (await prisma.user.findUnique({where:{email}})) throw new ApiError(409,'This email address is already registered.');
    const passwordHash = await bcrypt.hash(data.password,12);
    const user = await prisma.user.create({data:{fullName:data.fullName,email,passwordHash}});
    try { await sendVerification(user.id,email); } catch(e) {
      await prisma.user.delete({where:{id:user.id}});
      throw e;
    }
    res.status(201).json({success:true,message:'Account created. Check your university email for verification. In local development, the verification link is printed in the backend terminal.'});
  } catch(e) {next(e);}
});

authRouter.post('/resend-verification',async(req,res,next)=>{
  try {
    const {email} = emailSchema.parse(req.body);
    const user = await prisma.user.findUnique({where:{email:email.toLowerCase()}});
    if (user && !user.emailVerifiedAt) await sendVerification(user.id,user.email);
    res.json({success:true,message:'If the account needs verification, a new link has been sent.'});
  } catch(e) {next(e);}
});

authRouter.post('/verify',async(req,res,next)=>{
  try {
    const {token} = z.object({token:z.string().regex(/^[0-9a-f]{64}$/)}).parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await prisma.emailVerificationToken.findUnique({where:{tokenHash}});
    if (!record || record.expiresAt < new Date()) throw new ApiError(400,'Verification link is invalid or expired.');
    await prisma.$transaction(async(tx)=>{
      await tx.user.update({where:{id:record.userId},data:{emailVerifiedAt:new Date()}});
      await tx.emailVerificationToken.deleteMany({where:{userId:record.userId}});
    });
    res.json({success:true,message:'Email verified. You can now log in.'});
  }catch(e){next(e);}
});

authRouter.post('/login',async(req,res,next)=>{
  try {
    const {email,password} = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({where:{email:email.toLowerCase()}});
    if (!user || !(await bcrypt.compare(password,user.passwordHash))) throw new ApiError(401,'Incorrect email or password.');
    if (!user.emailVerifiedAt) throw new ApiError(403,'Verify your university email before logging in.');
    setSession(res,signSession(user.id,user.sessionVersion));
    res.json({success:true,data:{user:userView(user)},message:'Logged in successfully.'});
  }catch(e){next(e);}
});

authRouter.get('/me',requireAuth,(req,res)=>res.json({success:true,data:{user:req.user}}));
authRouter.post('/logout',requireAuth,async(req,res,next)=>{
  try {
    await prisma.user.update({where:{id:req.user!.id},data:{sessionVersion:{increment:1}}});
    clearSession(res);
    res.json({success:true,message:'Logged out.'});
  }catch(e){next(e);}
});
