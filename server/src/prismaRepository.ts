import { Prisma, PrismaClient } from '@prisma/client';
import type {
  ClaimFilters,
  ClaimRecord,
  ImageRecord,
  NewClaim,
  NewReport,
  PrivateDetails,
  ReportFilters,
  ReportRecord,
  Repository,
  Role,
  UserRecord
} from './domain.js';

const reportInclude = { privateDetails: true, images: true } as const;

function mapUser(user: { id: string; fullName: string; email: string; passwordHash: string; role: Role; createdAt: Date }): UserRecord {
  return { ...user };
}

function mapReport(report: Prisma.ReportGetPayload<{ include: typeof reportInclude }>): ReportRecord {
  const details: PrivateDetails = report.privateDetails ?? {
    secretAttributes: null,
    storageLocation: null,
    finderContact: null
  };
  return {
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
    privateDetails: details,
    images: report.images.map(image => ({ ...image, data: Buffer.from(image.data) })),
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
}

function mapClaim(claim: Prisma.ClaimGetPayload<Record<string, never>>): ClaimRecord {
  return { ...claim };
}

export class PrismaRepository implements Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  async findUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? mapUser(user) : null;
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? mapUser(user) : null;
  }

  async createUser(input: Pick<UserRecord, 'fullName' | 'email' | 'passwordHash'> & { role?: Role }) {
    return mapUser(await this.prisma.user.create({ data: input }));
  }

  async listMetadata() {
    const [categories, locations] = await Promise.all([
      this.prisma.itemCategory.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.campusLocation.findMany({ orderBy: { name: 'asc' } })
    ]);
    return { categories, locations };
  }

  async createReport(input: NewReport) {
    const { privateDetails, ...report } = input;
    const result = await this.prisma.report.create({
      data: { ...report, privateDetails: { create: privateDetails } },
      include: reportInclude
    });
    return mapReport(result);
  }

  async findReport(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id }, include: reportInclude });
    return report ? mapReport(report) : null;
  }

  async listReports(filters: ReportFilters) {
    const { q, ...directFilters } = filters;
    const where: Prisma.ReportWhereInput = {
      ...directFilters,
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { publicDescription: { contains: q, mode: 'insensitive' } }
        ]
      } : {})
    };
    const reports = await this.prisma.report.findMany({
      where,
      include: reportInclude,
      orderBy: { createdAt: 'desc' }
    });
    return reports.map(mapReport);
  }

  async updateReport(id: string, patch: Parameters<Repository['updateReport']>[1]) {
    const { privateDetails, ...scalarPatch } = patch;
    const report = await this.prisma.report.update({
      where: { id },
      data: {
        ...scalarPatch,
        ...(privateDetails ? {
          privateDetails: {
            upsert: {
              create: privateDetails,
              update: privateDetails
            }
          }
        } : {})
      },
      include: reportInclude
    });
    return mapReport(report);
  }

  async addImage(reportId: string, mimeType: string, data: Buffer) {
    const image = await this.prisma.reportImage.create({
      data: { reportId, mimeType, sizeBytes: data.length, data },
    });
    return { ...image, data: Buffer.from(image.data) };
  }

  async findImage(reportId: string, imageId: string) {
    const image = await this.prisma.reportImage.findFirst({ where: { id: imageId, reportId } });
    return image ? { ...image, data: Buffer.from(image.data) } : null;
  }

  async createClaim(input: NewClaim) {
    const claim = await this.prisma.claim.create({ data: input });
    return mapClaim(claim);
  }

  async findClaim(id: string) {
    const claim = await this.prisma.claim.findUnique({ where: { id } });
    return claim ? mapClaim(claim) : null;
  }

  async listClaims(filters: ClaimFilters) {
    const claims = await this.prisma.claim.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' }
    });
    return claims.map(mapClaim);
  }

  async decideClaim(id: string, reviewerId: string, status: 'APPROVED' | 'REJECTED', reason: string | null) {
    return this.prisma.$transaction(async transaction => {
      const current = await transaction.claim.findUnique({ where: { id } });
      if (!current || current.status !== 'PENDING_REVIEW') throw new Error('Pending claim not found.');
      if (status === 'APPROVED') {
        const closed = await transaction.report.updateMany({
          where: { id: current.reportId, status: 'APPROVED' },
          data: { status: 'CLOSED' }
        });
        if (closed.count !== 1) throw new Error('The found item is no longer available for claims.');
      }
      const result = await transaction.claim.updateMany({
        where: { id, status: 'PENDING_REVIEW' },
        data: { status, reviewReason: reason, reviewerId, reviewedAt: new Date() }
      });
      if (result.count !== 1) throw new Error('Pending claim not found.');
      if (status === 'APPROVED') {
        await transaction.claim.updateMany({
          where: { reportId: current.reportId, id: { not: id }, status: 'PENDING_REVIEW' },
          data: {
            status: 'REJECTED',
            reviewReason: 'Another claim was verified for this item.',
            reviewerId,
            reviewedAt: new Date()
          }
        });
      }
      const claim = await transaction.claim.findUniqueOrThrow({ where: { id } });
      return mapClaim(claim);
    });
  }
}
