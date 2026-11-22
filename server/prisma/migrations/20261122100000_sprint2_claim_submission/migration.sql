-- CLFR-63: private ownership claims for approved found reports.
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "ownershipEvidence" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Claim_reportId_status_idx" ON "Claim"("reportId", "status");
CREATE INDEX "Claim_claimantId_createdAt_idx" ON "Claim"("claimantId", "createdAt");

ALTER TABLE "Claim" ADD CONSTRAINT "Claim_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_claimantId_fkey"
    FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
