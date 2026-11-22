import { z } from 'zod';
import { ApiError } from '../lib/errors.js';

// All claim evidence is private. Do not accept names, contacts or protected
// report attributes from a public report response.
export const createClaimSchema = z.object({
  reportId: z.string().uuid(),
  ownershipEvidence: z.string().trim().min(20, 'Provide at least 20 characters of identifying evidence.').max(1000)
}).strict();

export type ClaimableReport = { reportType: string; status: string; reporterId: string };

export function assertClaimable(report: ClaimableReport | null, claimantId: string) {
  // Conceal unapproved reports and avoid distinguishing their existence.
  if (!report || report.status !== 'APPROVED' || report.reportType !== 'FOUND') {
    throw new ApiError(404, 'Approved found report not available for claiming.');
  }
  if (report.reporterId === claimantId) {
    throw new ApiError(403, 'You cannot claim an item you reported.');
  }
}

export function assertNoPendingClaim(alreadyPending: boolean) {
  if (alreadyPending) throw new ApiError(409, 'You already have a pending claim for this item.');
}
