import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth } from '../middleware/guards.js';
import { assertCanEdit, validateImageSignature } from '../services/reportRules.js';
export const reportsRouter = Router();
reportsRouter.use(requireAuth);

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{
  const d = new Date(v+'T00:00:00.000Z');
  // Campus dates are entered in Sri Lankan local time. Comparing UTC midnight
  // with the current instant incorrectly rejects today's date before 05:30 IST.
  const todayInSriLanka = new Date().toLocaleDateString('sv-SE', {timeZone:'Asia/Colombo'});
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === v && v <= todayInSriLanka;
},'Provide a valid date not in the future.');
export const reportSchema = z.object({
  reportType:z.enum(['LOST','FOUND']), title:z.string().trim().min(4).max(120),
  publicDescription:z.string().trim().min(12).max(2000),
  categoryId:z.coerce.number().int().positive(),locationId:z.coerce.number().int().positive(),
  eventDate:dateField,secretAttributes:z.string().trim().max(1000).optional().default(''),
  storageLocation:z.string().trim().max(500).optional().default(''),
  finderContact:z.string().trim().max(300).optional().default('')
}).superRefine((data,ctx)=>{
  if (data.reportType==='FOUND' && !data.secretAttributes) ctx.addIssue({code:'custom',path:['secretAttributes'],message:'A private identifying attribute is required for found items.'});
});
const reportInclude = {category:true,location:true,images:{select:{id:true,mimeType:true,sizeBytes:true,uploadedAt:true}},privateDetails:true} as const;
const toUserReport = <T extends {privateDetails?:unknown}>(r:T, canSeePrivate:boolean) => canSeePrivate?r:(({privateDetails,...rest})=>rest)(r);
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
const uploadsDir = path.resolve(process.env.FILE_UPLOAD_DIR || './uploads');

reportsRouter.get('/metadata',async(_req,res,next)=>{
  try {
    const [categories,locations] = await Promise.all([
      prisma.itemCategory.findMany({orderBy:{name:'asc'}}),prisma.campusLocation.findMany({orderBy:{name:'asc'}})
    ]);
    res.json({success:true,data:{categories,locations}});
  }catch(e){next(e);}
});

reportsRouter.post('/',async(req,res,next)=>{
  try {
    const data = reportSchema.parse(req.body);
    const category = await prisma.itemCategory.findUnique({where:{id:data.categoryId}});
    const location = await prisma.campusLocation.findUnique({where:{id:data.locationId}});
    if (!category || !location) throw new ApiError(400,'Invalid category or campus location.');
    const report = await prisma.$transaction(async(tx)=>{
      const created = await tx.report.create({data:{
        reporterId:req.user!.id,reportType:data.reportType,categoryId:data.categoryId,locationId:data.locationId,
        title:data.title,publicDescription:data.publicDescription,eventDate:new Date(data.eventDate+'T00:00:00.000Z'),
        privateDetails:{create:{secretAttributes:data.secretAttributes,storageLocation:data.storageLocation,finderContact:data.finderContact}}
      }});
      await tx.auditEvent.create({data:{actorId:req.user!.id,action:'REPORT_SUBMITTED',entityType:'REPORT',entityId:created.id}});
      return created;
    });
    res.status(201).json({success:true,data:{report},message:'Report sent for administrator review.'});
  }catch(e){next(e);}
});

reportsRouter.get('/mine',async(req,res,next)=>{
  try {
    const data = await prisma.report.findMany({where:{reporterId:req.user!.id},include:reportInclude,orderBy:{createdAt:'desc'}});
    res.json({success:true,data:{reports:data}});
  }catch(e){next(e);}
});

reportsRouter.get('/:id',async(req,res,next)=>{
  try {
    const report = await prisma.report.findUnique({where:{id:req.params.id},include:reportInclude});
    if (!report || (report.reporterId!==req.user!.id && req.user!.role!=='ADMIN')) throw new ApiError(404,'Report not found.');
    res.json({success:true,data:{report:toUserReport(report,true)}});
  }catch(e){next(e);}
});

reportsRouter.patch('/:id',async(req,res,next)=>{
  try {
    const data = reportSchema.parse(req.body);
    const before = await prisma.report.findUnique({where:{id:req.params.id}});
    if (!before || before.reporterId!==req.user!.id) throw new ApiError(404,'Report not found.');
    assertCanEdit(before.status);
    if (!await prisma.itemCategory.findUnique({where:{id:data.categoryId}}) || !await prisma.campusLocation.findUnique({where:{id:data.locationId}})) throw new ApiError(400,'Invalid category or campus location.');
    await prisma.$transaction(async tx => {
      const result = await tx.report.updateMany({where:{id:before.id,reporterId:req.user!.id,status:'REJECTED'},data:{
        reportType:data.reportType,title:data.title,publicDescription:data.publicDescription,categoryId:data.categoryId,locationId:data.locationId,eventDate:new Date(data.eventDate+'T00:00:00.000Z')
      }});
      if (result.count!==1) throw new ApiError(409,'Report status changed. Refresh and try again.');
      await tx.privateReportDetails.upsert({where:{reportId:before.id},update:{secretAttributes:data.secretAttributes,storageLocation:data.storageLocation,finderContact:data.finderContact},create:{reportId:before.id,secretAttributes:data.secretAttributes,storageLocation:data.storageLocation,finderContact:data.finderContact}});
    });
    res.json({success:true,message:'Report updated. Resubmit it for review when ready.'});
  }catch(e){next(e);}
});

reportsRouter.post('/:id/resubmit',async(req,res,next)=>{
  try {
    const result = await prisma.$transaction(async(tx)=>{
      const updated = await tx.report.updateMany({where:{id:req.params.id,reporterId:req.user!.id,status:'REJECTED'},data:{status:'PENDING_REVIEW',lastReviewReason:null}});
      if (!updated.count) throw new ApiError(409,'Only your rejected reports can be resubmitted.');
      await tx.auditEvent.create({data:{actorId:req.user!.id,entityType:'REPORT',entityId:req.params.id,action:'REPORT_RESUBMITTED'}});
      return updated;
    });
    res.json({success:true,data:{updated:result.count},message:'Report resubmitted for review.'});
  }catch(e){next(e);}
});

reportsRouter.post('/:id/images',upload.single('image'),async(req,res,next)=>{
  let storedPath: string|undefined;
  try {
    const report = await prisma.report.findUnique({where:{id:req.params.id}});
    if (!report || report.reporterId!==req.user!.id) throw new ApiError(404,'Report not found.');
    if (!['PENDING_REVIEW','REJECTED'].includes(report.status)) throw new ApiError(409,'Images cannot be changed after approval.');
    if (!req.file) throw new ApiError(400,'Choose an image to upload.');
    const detected = validateImageSignature(req.file.buffer);
    if (!detected) throw new ApiError(400,'Only genuine JPEG, PNG or WebP images are allowed.');
    const count = await prisma.reportImage.count({where:{reportId:report.id}});
    if (count>=3) throw new ApiError(409,'Maximum three images per report.');
    const storedName = crypto.randomUUID()+'.'+detected.ext;
    await fs.mkdir(uploadsDir,{recursive:true});
    storedPath = path.join(uploadsDir,storedName);
    await fs.writeFile(storedPath,req.file.buffer,{flag:'wx'});
    const record = await prisma.reportImage.create({data:{reportId:report.id,storedName,mimeType:detected.mime,sizeBytes:req.file.size}});
    res.status(201).json({success:true,data:{image:{id:record.id,mimeType:record.mimeType,sizeBytes:record.sizeBytes}},message:'Image uploaded successfully.'});
  }catch(e){ if (storedPath) await fs.unlink(storedPath).catch(()=>{}); next(e);}
});

reportsRouter.get('/:id/images/:imageId',async(req,res,next)=>{
  try {
    const image = await prisma.reportImage.findUnique({where:{id:req.params.imageId},include:{report:true}});
    if (!image || image.reportId!==req.params.id) throw new ApiError(404,'Image not found.');
    if (image.report.reporterId!==req.user!.id && req.user!.role!=='ADMIN' && image.report.status!=='APPROVED') throw new ApiError(404,'Image not found.');
    const storedPath = path.join(uploadsDir,path.basename(image.storedName));
    res.setHeader('Content-Type',image.mimeType);
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.sendFile(storedPath,err => { if(err && !res.headersSent) next(new ApiError(404,'Image file unavailable.')); });
  }catch(e){next(e);}
});
