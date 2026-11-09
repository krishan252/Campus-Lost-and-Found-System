export type Role = 'USER' | 'ADMIN';
export type ReportType = 'LOST' | 'FOUND';
export type ReportStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED';
export type ClaimStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
};

export type Picklist = { id: number; name: string };
export type PrivateDetails = {
  secretAttributes: string | null;
  storageLocation: string | null;
  finderContact: string | null;
};

export type ImageRecord = {
  id: string;
  reportId: string;
  mimeType: string;
  sizeBytes: number;
  data: Buffer;
  uploadedAt: Date;
};

export type ReportRecord = {
  id: string;
  reporterId: string;
  reportType: ReportType;
  categoryId: number;
  locationId: number;
  title: string;
  publicDescription: string;
  eventDate: Date;
  status: ReportStatus;
  lastReviewReason: string | null;
  privateDetails: PrivateDetails;
  images: ImageRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export type ClaimRecord = {
  id: string;
  reportId: string;
  claimantId: string;
  identifyingDetails: string;
  status: ClaimStatus;
  reviewReason: string | null;
  reviewerId: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
};

export type ReportFilters = {
  reporterId?: string;
  status?: ReportStatus;
  reportType?: ReportType;
  categoryId?: number;
  locationId?: number;
  q?: string;
};

export type ClaimFilters = {
  claimantId?: string;
  status?: ClaimStatus;
};

export type NewReport = Omit<ReportRecord, 'id' | 'images' | 'createdAt' | 'updatedAt' | 'status' | 'lastReviewReason'>;
export type NewClaim = Pick<ClaimRecord, 'reportId' | 'claimantId' | 'identifyingDetails'>;

export interface Repository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(input: Pick<UserRecord, 'fullName' | 'email' | 'passwordHash'> & { role?: Role }): Promise<UserRecord>;
  listMetadata(): Promise<{ categories: Picklist[]; locations: Picklist[] }>;
  createReport(input: NewReport): Promise<ReportRecord>;
  findReport(id: string): Promise<ReportRecord | null>;
  listReports(filters: ReportFilters): Promise<ReportRecord[]>;
  updateReport(id: string, patch: Partial<Pick<ReportRecord, 'reportType' | 'categoryId' | 'locationId' | 'title' | 'publicDescription' | 'eventDate' | 'privateDetails' | 'status' | 'lastReviewReason'>>): Promise<ReportRecord>;
  addImage(reportId: string, mimeType: string, data: Buffer): Promise<ImageRecord>;
  findImage(reportId: string, imageId: string): Promise<ImageRecord | null>;
  createClaim(input: NewClaim): Promise<ClaimRecord>;
  findClaim(id: string): Promise<ClaimRecord | null>;
  listClaims(filters: ClaimFilters): Promise<ClaimRecord[]>;
  decideClaim(id: string, reviewerId: string, status: Exclude<ClaimStatus, 'PENDING_REVIEW'>, reason: string | null): Promise<ClaimRecord>;
}
