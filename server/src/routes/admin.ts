import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth,requireAdmin } from '../middleware/guards.js';
import { assertCanModerate } from '../services/reportRules.js';
export const adminRouter = Router();
adminRouter.use(requireAuth,requireAdmin);
const include = {reporter:{select:{id:true,fullName:true,email:true}},category:true,location:true,privateDetails:true,images:{select:{id:true,mimeType:true,sizeBytes:true}}} as const;
adminRouter.get('/reports/pending',async(_req,res,next)=>{
  try {
    const reports = await prisma.report.findMany({where:{status:'PENDING_REVIEW'},include,orderBy:{createdAt:'asc'}});
    res.json({success:true,data:{reports}});
  }catch(e){next(e);}
});
adminRouter.get('/reports/:id',async(req,res,next)=>{
  try {
    const report = await prisma.report.findUnique({where:{id:req.params.id},include});
    if(!report) throw new ApiError(404,'Report not found.');
    res.json({success:true,data:{report}});
  }catch(e){next(e);}
});
async function decide(reportId:string,adminId:string,decision:'APPROVED'|'REJECTED',reason?:string) {
  return prisma.$transaction(async(tx)=>{
    const current = await tx.report.findUnique({where:{id:reportId}});
    if (!current) throw new ApiError(404,'Report not found.');
    assertCanModerate(current.status);
    const result = await tx.report.updateMany({where:{id:reportId,status:'PENDING_REVIEW'},data:{status:decision,lastReviewReason:decision==='REJECTED'?reason??'No reason provided':null}});
    if (!result.count) throw new ApiError(409,'Report was already reviewed.');
    await tx.moderationReview.create({data:{reportId,reviewerId:adminId,decision,reason:reason||null}});
    await tx.auditEvent.create({data:{actorId:adminId,action:`REPORT_${decision}`,entityType:'REPORT',entityId:reportId,metadata:{reason:reason||null}}});
  });
}
adminRouter.post('/reports/:id/approve',async(req,res,next)=>{
  try {await decide(req.params.id,req.user!.id,'APPROVED');res.json({success:true,message:'Report approved. It is now visible in the public repository.'});}
  catch(e){next(e);}
});
adminRouter.post('/reports/:id/reject',async(req,res,next)=>{
  try {
    const {reason} = z.object({reason:z.string().trim().min(5).max(500)}).parse(req.body);
    await decide(req.params.id,req.user!.id,'REJECTED',reason);
    res.json({success:true,message:'Report rejected with reason.'});
  }catch(e){next(e);}
});
