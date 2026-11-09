import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { ReportRecord, Repository } from '../domain.js';
import { canManageReport, requireAuth } from '../auth.js';
import { ApiError } from '../errors.js';

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const reportSchema = z.object({
  reportType: z.enum(['LOST', 'FOUND']),
  title: z.string().trim().min(4).max(120),
  publicDescription: z.string().trim().min(12).max(2000),
  categoryId: z.coerce.number().int().positive(),
  locationId: z.coerce.number().int().positive(),
  eventDate: z.coerce.date().max(new Date()),
  secretAttributes: z.string().trim().max(1000).optional().default(''),
  storageLocation: z.string().trim().max(500).optional().default(''),
  finderContact: z.string().trim().max(300).optional().default('')
});

function presentReport(report: ReportRecord, repository: Repository, includePrivate: boolean) {
  return repository.listMetadata().then(({ categories, locations }) => ({
    id: report.id,
    reporterId: report.reporterId,
    reportType: report.reportType,
    categoryId: report.categoryId,
    locationId: report.locationId,
    title: report.title,
    publicDescription: report.publicDescription,
    eventDate: report.eventDate,
    status: report.status,
    lastReviewReason: report.lastReviewReason,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    category: categories.find(category => category.id === report.categoryId),
    location: locations.find(location => location.id === report.locationId),
    images: report.images.map(({ id, mimeType, sizeBytes }) => ({ id, mimeType, sizeBytes })),
    ...(includePrivate ? { privateDetails: report.privateDetails } : {})
  }));
}

function validImage(buffer: Buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export function reportsRouter(repository: Repository) {
  const router = Router();
  const auth = requireAuth(repository);

  router.get('/metadata', async (_req, res, next) => {
    try { res.json({ success: true, data: await repository.listMetadata() }); } catch (error) { next(error); }
  });

  router.get('/search', async (req, res, next) => {
    try {
      const filters = z.object({
        q: z.string().trim().max(100).optional(),
        reportType: z.enum(['LOST', 'FOUND']).optional(),
        categoryId: z.coerce.number().int().positive().optional(),
        locationId: z.coerce.number().int().positive().optional()
      }).parse(req.query);
      const results = await repository.listReports({ ...filters, status: 'APPROVED' });
      const reports = await Promise.all(results.map(report => presentReport(report, repository, false)));
      res.json({ success: true, data: { reports } });
    } catch (error) { next(error); }
  });

  router.get('/mine', auth, async (req, res, next) => {
    try {
      const reports = await repository.listReports({ reporterId: req.user!.id });
      res.json({ success: true, data: { reports: await Promise.all(reports.map(report => presentReport(report, repository, true))) } });
    } catch (error) { next(error); }
  });

  router.post('/', auth, async (req, res, next) => {
    try {
      const data = reportSchema.parse(req.body);
      const metadata = await repository.listMetadata();
      if (!metadata.categories.some(item => item.id === data.categoryId) || !metadata.locations.some(item => item.id === data.locationId)) {
        throw new ApiError(400, 'Choose a valid category and campus location.');
      }
      if (data.reportType === 'FOUND' && !data.secretAttributes.trim()) throw new ApiError(400, 'Provide a private feature that can verify an ownership claim.');
      const report = await repository.createReport({
        reporterId: req.user!.id,
        reportType: data.reportType,
        categoryId: data.categoryId,
        locationId: data.locationId,
        title: data.title,
        publicDescription: data.publicDescription,
        eventDate: data.eventDate,
        privateDetails: {
          secretAttributes: data.secretAttributes || null,
          storageLocation: data.storageLocation || null,
          finderContact: data.finderContact || null
        }
      });
      res.status(201).json({ success: true, data: { report: await presentReport(report, repository, true) } });
    } catch (error) { next(error); }
  });

  router.get('/:id/images/:imageId', auth, async (req, res, next) => {
    try {
      const report = await repository.findReport(req.params.id);
      if (!report) throw new ApiError(404, 'Report not found.');
      if (!canManageReport(req, report.reporterId) && report.status !== 'APPROVED' && report.status !== 'CLOSED') throw new ApiError(403, 'You cannot access this image.');
      const image = await repository.findImage(report.id, req.params.imageId);
      if (!image) throw new ApiError(404, 'Image not found.');
      res.type(image.mimeType).set('Cache-Control', 'private, no-store').send(image.data);
    } catch (error) { next(error); }
  });

  router.post('/:id/images', auth, imageUpload.single('image'), async (req, res, next) => {
    try {
      const report = await repository.findReport(req.params.id);
      if (!report) throw new ApiError(404, 'Report not found.');
      if (report.reporterId !== req.user!.id || report.status !== 'PENDING_REVIEW') throw new ApiError(403, 'You cannot add images to this report.');
      if (!req.file) throw new ApiError(400, 'Select an image to upload.');
      const mimeType = validImage(req.file.buffer);
      if (!mimeType) throw new ApiError(400, 'Only valid JPEG, PNG or WebP images are accepted.');
      if (report.images.length >= 3) throw new ApiError(400, 'A report can include at most three images.');
      const image = await repository.addImage(report.id, mimeType, req.file.buffer);
      res.status(201).json({ success: true, data: { image: { id: image.id, mimeType: image.mimeType, sizeBytes: image.sizeBytes } } });
    } catch (error) { next(error); }
  });

  router.get('/:id', auth, async (req, res, next) => {
    try {
      const report = await repository.findReport(req.params.id);
      if (!report) throw new ApiError(404, 'Report not found.');
      const isOwnerOrAdmin = canManageReport(req, report.reporterId);
      if (!isOwnerOrAdmin && report.status !== 'APPROVED' && report.status !== 'CLOSED') throw new ApiError(403, 'You cannot access this report.');
      res.json({ success: true, data: { report: await presentReport(report, repository, isOwnerOrAdmin) } });
    } catch (error) { next(error); }
  });

  router.patch('/:id', auth, async (req, res, next) => {
    try {
      const report = await repository.findReport(req.params.id);
      if (!report) throw new ApiError(404, 'Report not found.');
      if (report.reporterId !== req.user!.id || report.status !== 'REJECTED') throw new ApiError(403, 'Only your rejected reports can be edited.');
      const data = reportSchema.parse(req.body);
      const updated = await repository.updateReport(report.id, {
        ...data,
        privateDetails: {
          secretAttributes: data.secretAttributes || null,
          storageLocation: data.storageLocation || null,
          finderContact: data.finderContact || null
        },
        status: 'PENDING_REVIEW',
        lastReviewReason: null
      });
      res.json({ success: true, data: { report: await presentReport(updated, repository, true) } });
    } catch (error) { next(error); }
  });

  router.post('/:id/resubmit', auth, async (req, res, next) => {
    try {
      const report = await repository.findReport(req.params.id);
      if (!report || report.reporterId !== req.user!.id || report.status !== 'PENDING_REVIEW') throw new ApiError(400, 'Report is not ready to be resubmitted.');
      res.json({ success: true, message: 'Report submitted for review.' });
    } catch (error) { next(error); }
  });

  return router;
}
