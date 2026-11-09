import { randomUUID } from 'node:crypto';
import type {
  ClaimFilters,
  ClaimRecord,
  NewClaim,
  NewReport,
  Picklist,
  ReportFilters,
  ReportRecord,
  Repository,
  Role,
  UserRecord
} from './domain.js';

const categories = ['Electronics & Laptops', 'Wallets, IDs & Cards', 'Keys', 'Books & Stationery', 'Clothing & Accessories', 'Other'];
const locations = ['Central Library', 'Engineering Complex', 'Student Activity Centre', 'Science Laboratories', 'Sports Ground', 'Other'];

export class MemoryRepository implements Repository {
  private readonly users = new Map<string, UserRecord>();
  private readonly reports = new Map<string, ReportRecord>();
  private readonly claims = new Map<string, ClaimRecord>();
  private readonly categoryRows: Picklist[] = categories.map((name, index) => ({ id: index + 1, name }));
  private readonly locationRows: Picklist[] = locations.map((name, index) => ({ id: index + 1, name }));

  async health() {}

  async reset() {
    this.users.clear();
    this.reports.clear();
    this.claims.clear();
  }

  async findUserByEmail(email: string) {
    return [...this.users.values()].find(user => user.email === email) ?? null;
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async createUser(input: Pick<UserRecord, 'fullName' | 'email' | 'passwordHash'> & { role?: Role }) {
    const user: UserRecord = { ...input, id: randomUUID(), role: input.role ?? 'USER', createdAt: new Date() };
    this.users.set(user.id, user);
    return user;
  }

  async listMetadata() {
    return { categories: this.categoryRows, locations: this.locationRows };
  }

  async createReport(input: NewReport) {
    const now = new Date();
    const report: ReportRecord = {
      ...input,
      id: randomUUID(),
      images: [],
      status: 'PENDING_REVIEW',
      lastReviewReason: null,
      createdAt: now,
      updatedAt: now
    };
    this.reports.set(report.id, report);
    return report;
  }

  async findReport(id: string) {
    return this.reports.get(id) ?? null;
  }

  async listReports(filters: ReportFilters) {
    const query = filters.q?.toLocaleLowerCase();
    return [...this.reports.values()]
      .filter(report => !filters.reporterId || report.reporterId === filters.reporterId)
      .filter(report => !filters.status || report.status === filters.status)
      .filter(report => !filters.reportType || report.reportType === filters.reportType)
      .filter(report => !filters.categoryId || report.categoryId === filters.categoryId)
      .filter(report => !filters.locationId || report.locationId === filters.locationId)
      .filter(report => !query || `${report.title} ${report.publicDescription}`.toLocaleLowerCase().includes(query))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateReport(id: string, patch: Parameters<Repository['updateReport']>[1]) {
    const report = this.reports.get(id);
    if (!report) throw new Error('Report not found.');
    const updated = { ...report, ...patch, updatedAt: new Date() };
    this.reports.set(id, updated);
    return updated;
  }

  async addImage(reportId: string, mimeType: string, data: Buffer) {
    const report = this.reports.get(reportId);
    if (!report) throw new Error('Report not found.');
    const image = { id: randomUUID(), reportId, mimeType, sizeBytes: data.length, data, uploadedAt: new Date() };
    report.images.push(image);
    return image;
  }

  async findImage(reportId: string, imageId: string) {
    return this.reports.get(reportId)?.images.find(image => image.id === imageId) ?? null;
  }

  async createClaim(input: NewClaim) {
    const claim: ClaimRecord = {
      ...input,
      id: randomUUID(),
      status: 'PENDING_REVIEW',
      reviewReason: null,
      reviewerId: null,
      createdAt: new Date(),
      reviewedAt: null
    };
    this.claims.set(claim.id, claim);
    return claim;
  }

  async findClaim(id: string) {
    return this.claims.get(id) ?? null;
  }

  async listClaims(filters: ClaimFilters) {
    return [...this.claims.values()]
      .filter(claim => !filters.claimantId || claim.claimantId === filters.claimantId)
      .filter(claim => !filters.status || claim.status === filters.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async decideClaim(id: string, reviewerId: string, status: 'APPROVED' | 'REJECTED', reason: string | null) {
    const claim = this.claims.get(id);
    if (!claim) throw new Error('Claim not found.');
    const decided = { ...claim, status, reviewReason: reason, reviewerId, reviewedAt: new Date() };
    this.claims.set(id, decided);
    if (status === 'APPROVED') await this.updateReport(claim.reportId, { status: 'CLOSED' });
    return decided;
  }
}
