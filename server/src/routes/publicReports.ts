/**
 * Public, read-only approved reports repository.
 * Adapted for the local UniTrace Prisma 5 schema. Never expose reporter,
 * privateDetails, secretAttributes, storageLocation, finderContact or audit data.
 */
import { Router } from 'express';
import { z } from 'zod';
import path from 'node:path';
import { prisma } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';

export const publicReportsRouter = Router();

const filtersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  reportType: z.enum(['LOST', 'FOUND']).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional()
});

// SELECT explicitly allows only fields suitable for the public repository.
const publicFields = {
  id: true,
  title: true,
  publicDescription: true,
  reportType: true,
  status: true,
  eventDate: true,
  createdAt: true,
  category: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
  images: { select: { id: true, mimeType: true, sizeBytes: true }, orderBy: { uploadedAt: 'asc' as const } }
} as const;

publicReportsRouter.get('/metadata', async (_req, res, next) => {
  try {
    const [categories, locations] = await Promise.all([
      prisma.itemCategory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.campusLocation.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    ]);
    res.json({ success: true, data: { categories, locations } });
  } catch (error) { next(error); }
});

publicReportsRouter.get('/reports', async (req, res, next) => {
  try {
    const { q, reportType, categoryId, locationId } = filtersSchema.parse(req.query);
    const reports = await prisma.report.findMany({
      where: {
        status: 'APPROVED',
        ...(reportType ? { reportType } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(locationId ? { locationId } : {}),
        ...(q ? { OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { publicDescription: { contains: q, mode: 'insensitive' as const } }
        ] } : {})
      },
      select: publicFields,
      orderBy: { createdAt: 'desc' },
      take: 48
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: { reports } });
  } catch (error) { next(error); }
});

publicReportsRouter.get('/reports/:id', async (req, res, next) => {
  try {
    const report = await prisma.report.findFirst({
      where: { id: req.params.id, status: 'APPROVED' },
      select: publicFields
    });
    if (!report) throw new ApiError(404, 'Approved report not found.');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: { report } });
  } catch (error) { next(error); }
});

const uploadsDir = path.resolve(process.env.FILE_UPLOAD_DIR || './uploads');
publicReportsRouter.get('/reports/:id/images/:imageId', async (req, res, next) => {
  try {
    // File must belong to an approved report. Pending or rejected photos stay private.
    const image = await prisma.reportImage.findFirst({
      where: {
        id: req.params.imageId,
        reportId: req.params.id,
        report: { status: 'APPROVED' }
      },
      select: { storedName: true, mimeType: true }
    });
    if (!image) throw new ApiError(404, 'Image not found.');
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(path.join(uploadsDir, path.basename(image.storedName)), error => {
      if (error && !res.headersSent) next(new ApiError(404, 'Image file unavailable.'));
    });
  } catch (error) { next(error); }
});
