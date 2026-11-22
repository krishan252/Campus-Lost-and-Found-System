import { describe, expect, it } from 'vitest';
import { assertClaimable, assertNoPendingClaim, createClaimSchema } from '../src/services/claimRules.js';

const claimantId = 'student-123';
const found = { status: 'APPROVED', reportType: 'FOUND', reporterId: 'student-456' };

describe('CLFR-63: submit ownership claim', () => {
  it('accepts a valid found-item claim with identifying evidence', () => {
    expect(createClaimSchema.parse({ reportId: '9b127692-e6e5-4a21-98ac-a1b2525e3773', ownershipEvidence: 'There is a small unique mark on the underside.' }).ownershipEvidence).toContain('unique');
  });
  it('rejects weak or excessive evidence and unknown input fields', () => {
    const input = { reportId: '9b127692-e6e5-4a21-98ac-a1b2525e3773' };
    expect(createClaimSchema.safeParse({ ...input, ownershipEvidence: 'short' }).success).toBe(false);
    expect(createClaimSchema.safeParse({ ...input, ownershipEvidence: 'x'.repeat(1001) }).success).toBe(false);
    expect(createClaimSchema.safeParse({ ...input, ownershipEvidence: 'x'.repeat(30), role: 'ADMIN' }).success).toBe(false);
    expect(createClaimSchema.safeParse({ ...input, ownershipEvidence: 'x'.repeat(30), reportId: 'abc' }).success).toBe(false);
  });
  it('only permits approved FOUND reports', () => {
    expect(() => assertClaimable(found, claimantId)).not.toThrow();
    for (const report of [null, {...found, status: 'REJECTED'}, {...found, status: 'PENDING_REVIEW'}, {...found, reportType: 'LOST'}]) {
      expect(() => assertClaimable(report, claimantId)).toThrow();
    }
  });
  it('prevents a user from claiming their own report', () => {
    expect(() => assertClaimable({...found, reporterId: claimantId}, claimantId)).toThrow();
  });
  it('rejects an already pending claim', () => {
    expect(() => assertNoPendingClaim(false)).not.toThrow();
    expect(() => assertNoPendingClaim(true)).toThrow();
  });
});
