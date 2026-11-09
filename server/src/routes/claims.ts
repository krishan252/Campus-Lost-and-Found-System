import { Router } from 'express';
import { z } from 'zod';
import type { Repository } from '../domain.js';
import { requireAuth } from '../auth.js';
import { ApiError } from '../errors.js';

const claimSchema = z.object({ identifyingDetails: z.string().trim().min(10).max(1500) });

export function claimsRouter(repository: Repository) {
  const router = Router();
  const auth = requireAuth(repository);

  router.get('/claims/mine', auth, async (req, res, next) => {
    try {
      const claims = await repository.listClaims({ claimantId: req.user!.id });
      const data = await Promise.all(claims.map(async claim => {
        const report = await repository.findReport(claim.reportId);
        return { ...claim, report: report ? { id: report.id, title: report.title, reportType: report.reportType, status: report.status } : null };
      }));
      res.json({ success: true, data: { claims: data } });
    } catch (error) { next(error); }
  });

  router.post('/reports/:reportId/claims', auth, async (req, res, next) => {
    try {
      const data = claimSchema.parse(req.body);
      const report = await repository.findReport(req.params.reportId);
      if (!report || report.status !== 'APPROVED' || report.reportType !== 'FOUND') throw new ApiError(404, 'This found item is not available for claiming.');
      if (report.reporterId === req.user!.id) throw new ApiError(403, 'You cannot claim your own found-item report.');
      const existing = (await repository.listClaims({ claimantId: req.user!.id })).some(claim => claim.reportId === report.id);
      if (existing) throw new ApiError(409, 'You have already submitted a claim for this item.');
      const claim = await repository.createClaim({ reportId: report.id, claimantId: req.user!.id, identifyingDetails: data.identifyingDetails });
      res.status(201).json({ success: true, data: { claim }, message: 'Claim submitted for verification.' });
    } catch (error) { next(error); }
  });

  return router;
}
