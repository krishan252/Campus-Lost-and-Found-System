/**
 * CLFR-59 regression tests: public approved-item browsing.
 * The database client is mocked, so no real database or user credentials are needed.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { AddressInfo } from 'node:net';

vi.mock('../src/lib/db.js', () => ({
  prisma: {
    report: { findMany: vi.fn(), findFirst: vi.fn() },
    itemCategory: { findMany: vi.fn() },
    campusLocation: { findMany: vi.fn() },
    reportImage: { findFirst: vi.fn() }
  }
}));

import { prisma } from '../src/lib/db.js';
import { publicReportsRouter } from '../src/routes/publicReports.js';
import type { ErrorRequestHandler } from 'express';

const listReports = vi.mocked(prisma.report.findMany);
const singleReport = vi.mocked(prisma.report.findFirst);

const approvedReport = {
  id: 'approved-report-id', title: 'Found black calculator',
  publicDescription: 'Found near the library.', reportType: 'FOUND',
  status: 'APPROVED', eventDate: '2026-11-16T00:00:00.000Z',
  createdAt: '2026-11-17T12:00:00.000Z',
  category: { id: 1, name: 'Electronics' },
  location: { id: 2, name: 'Library' },
  images: []
};

let server: Server;
let url: string;
beforeAll(async () => {
  const app = express();
  app.use('/api/v1/public', publicReportsRouter);
  const testErrorHandler: ErrorRequestHandler = (error: Error & { status?: number }, _req, res, _next) => {
    res.status(error.status || 500).json({ success: false, message: error.message });
  };
  app.use(testErrorHandler);
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
});
beforeEach(() => vi.resetAllMocks());

describe('CLFR-59: browse approved lost and found reports', () => {
  it('lists approved reports publicly without requiring a login', async () => {
    listReports.mockResolvedValueOnce([approvedReport] as never);
    const response = await fetch(`${url}/api/v1/public/reports`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.reports).toHaveLength(1);
    expect(body.data.reports[0].title).toBe('Found black calculator');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('requests ONLY approved database rows and explicitly excludes sensitive fields', async () => {
    listReports.mockResolvedValueOnce([]);
    await fetch(`${url}/api/v1/public/reports`);
    expect(listReports).toHaveBeenCalledTimes(1);
    const query = listReports.mock.calls[0][0]!;
    expect(query.where).toMatchObject({ status: 'APPROVED' });
    expect(query.take).toBeLessThanOrEqual(48);
    expect(query.orderBy).toEqual({ createdAt: 'desc' });
    expect(query.select).toMatchObject({
      id: true, title: true, publicDescription: true,
      category: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } }
    });
    const publicFields = Object.keys(query.select as object);
    for (const sensitive of ['privateDetails', 'secretAttributes', 'storageLocation', 'finderContact', 'reporter', 'reporterId', 'reviews', 'auditEvents']) {
      expect(publicFields).not.toContain(sensitive);
    }
  });

  it('returns a clean empty list when no reports have been approved', async () => {
    listReports.mockResolvedValueOnce([]);
    const response = await fetch(`${url}/api/v1/public/reports`);
    expect(response.status).toBe(200);
    expect((await response.json()).data.reports).toEqual([]);
  });

  it('allows safe details for an approved report, but queries no unapproved details', async () => {
    singleReport.mockResolvedValueOnce(approvedReport as never);
    const response = await fetch(`${url}/api/v1/public/reports/approved-report-id`);
    expect(response.status).toBe(200);
    expect(singleReport.mock.calls[0][0]?.where).toMatchObject({
      id: 'approved-report-id', status: 'APPROVED'
    });
    expect(JSON.stringify((await response.json()).data)).not.toMatch(/secretAttributes|finderContact|storageLocation/);
  });

  it('does not reveal unapproved or missing report details', async () => {
    singleReport.mockResolvedValueOnce(null);
    const response = await fetch(`${url}/api/v1/public/reports/pending-report-id`);
    expect(response.status).toBe(404);
    expect((await response.json()).message).toBe('Approved report not found.');
  });
});
