import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth } from '../middleware/guards.js';
import { assertClaimable, assertNoPendingClaim, createClaimSchema } from '../services/claimRules.js';

export const claimsRouter = Router();
claimsRouter.use(requireAuth);

// CLFR-63: submit ownership evidence. No personal contact or item secret is disclosed.
claimsRouter.post('/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }), async (req, res, next) => {
  try {
    if (req.user!.role !== 'USER') throw new ApiError(403, 'Only student or staff accounts can submit claims.');
    const { reportId, ownershipEvidence } = createClaimSchema.parse(req.body);
    const claimantId = req.user!.id;

    const claim = await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id: reportId },
        select: { status: true, reportType: true, reporterId: true }
      });
      assertClaimable(report, claimantId);

      // Prevent normal repeat submissions; CLFR-64 adds database-level race protection.
      const alreadyPending = await tx.claim.findFirst({
        where: { reportId, claimantId, status: 'PENDING' },
        select: { id: true }
      });
      assertNoPendingClaim(Boolean(alreadyPending));

      const created = await tx.claim.create({
        data: { reportId, claimantId, ownershipEvidence },
        select: { id: true, reportId: true, status: true, createdAt: true }
      });
      await tx.auditEvent.create({
        data: { actorId: claimantId, action: 'CLAIM_SUBMITTED', entityType: 'CLAIM', entityId: created.id,
          metadata: { reportId } } // Never log private evidence.
      });
      return created;
    });

    res.setHeader('Cache-Control', 'no-store');
    res.status(201).json({
      success: true,
      message: 'Your claim was submitted for verification.',
      data: { claim }
    });
  } catch (error) { next(error); }
});
