import type { ReportRecord, Repository } from '../domain.js';

export async function presentAdminReport(report: ReportRecord, repository: Repository) {
  const [{ categories, locations }, reporter] = await Promise.all([
    repository.listMetadata(),
    repository.findUserById(report.reporterId)
  ]);
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
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    category: categories.find(category => category.id === report.categoryId),
    location: locations.find(location => location.id === report.locationId),
    images: report.images.map(({ id, mimeType, sizeBytes }) => ({ id, mimeType, sizeBytes })),
    privateDetails: report.privateDetails,
    reporter: reporter ? { id: reporter.id, fullName: reporter.fullName, email: reporter.email } : null
  };
}
