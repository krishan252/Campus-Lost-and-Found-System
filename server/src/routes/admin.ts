import { Router } from 'express';
import { z } from 'zod';
import type { Repository } from '../domain.js';
import { requireAdmin, requireAuth } from '../auth.js';
import { ApiError } from '../errors.js';
import { presentAdminReport } from './presentAdminReport.js';

export function adminRouter(repository: Repository) {
  const router = Router();
  const adminOnly = [requireAuth(repository), requireAdmin];

  router.get('/reports/pending', ...adminOnly, async (_req, res, next) => {
    try {
      const reports = await repository.listReports({ status: 'PENDING_REVIEW' });
      res.json({ success: true, data: { reports: await Promise.all(reports.map(report => presentAdminReport(report, repository))) } });
    } catch (error) { next(error); }
  });

  router.post('/reports/:id/approve', ...adminOnly, async (req, res, next) => {
    try {
      const report = await repository.findReport(req.params.id);
      if (!report || report.status !== 'PENDING_REVIEW') throw new ApiError(404, 'Pending report not found.');
      await repository.updateReport(report.id, { status: 'APPROVED', lastReviewReason: null });
      res.json({ success: true, message: 'Report approved and published.' });
    } catch (error) { next(error); }
  });

  router.post('/reports/:id/reject', ...adminOnly, async (req, res, next) => {
    try {
      const { reason } = z.object({ reason: z.string().trim().min(5).max(500) }).parse(req.body);
      const report = await repository.findReport(req.params.id);
      if (!report || report.status !== 'PENDING_REVIEW') throw new ApiError(404, 'Pending report not found.');
      await repository.updateReport(report.id, { status: 'REJECTED', lastReviewReason: reason });
      res.json({ success: true, message: 'Report rejected with feedback.' });
    } catch (error) { next(error); }
  });

  router.get('/claims', ...adminOnly, async (_req, res, next) => {
    try {
      const claims = await repository.listClaims({ status: 'PENDING_REVIEW' });
      const data = await Promise.all(claims.map(async claim => {
        const report = await repository.findReport(claim.reportId);
        const claimant = await repository.findUserById(claim.claimantId);
        return { ...claim, report: report ? await presentAdminReport(report, repository) : null, claimant: claimant ? { id: claimant.id, fullName: claimant.fullName, email: claimant.email } : null };
      }));
      res.json({ success: true, data: { claims: data } });
    } catch (error) { next(error); }
  });

  router.post('/claims/:id/decision', ...adminOnly, async (req, res, next) => {
    try {
      const data = z.object({
        status: z.enum(['APPROVED', 'REJECTED']),
        reason: z.string().trim().max(500).optional().default('')
      }).refine(value => value.status !== 'REJECTED' || value.reason.length >= 5, 'Provide at least five characters of feedback.').parse(req.body);
      const claim = await repository.findClaim(req.params.id);
      if (!claim || claim.status !== 'PENDING_REVIEW') throw new ApiError(404, 'Pending claim not found.');
      const report = await repository.findReport(claim.reportId);
      if (!report || report.status !== 'APPROVED') throw new ApiError(409, 'The found item is no longer available for claims.');
      const decided = await repository.decideClaim(claim.id, req.user!.id, data.status, data.status === 'REJECTED' ? data.reason : null);
      res.json({ success: true, data: { claim: decided }, message: data.status === 'APPROVED' ? 'Claim verified and item marked as returned.' : 'Claim rejected with feedback.' });
    } catch (error) { next(error); }
  });

  return router;
}
