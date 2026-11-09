import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MemoryRepository } from '../src/memoryRepository.js';

const repository = new MemoryRepository();
const app = createApp(repository);

describe('Campus Lost and Found API', () => {
  afterEach(async () => {
    await repository.reset();
  });

  it('reports healthy status and rejects unauthenticated report access', async () => {
    const health = await request(app).get('/api/v1/health');
    expect(health.status).toBe(200);
    expect(health.body.data.status).toBe('ok');
    const mine = await request(app).get('/api/v1/reports/mine');
    expect(mine.status).toBe(401);
  });

  it('registers, creates a found-item report, and keeps private details out of public search', async () => {
    const agent = request.agent(app);
    const register = await agent.post('/api/v1/auth/register').send({
      fullName: 'Campus User',
      email: `campus-${Date.now()}@example.edu`,
      password: 'a-strong-password'
    });
    expect(register.status).toBe(201);
    const report = await agent.post('/api/v1/reports').send({
      reportType: 'FOUND',
      title: 'Blue water bottle',
      publicDescription: 'Blue bottle found outside the library.',
      categoryId: 6,
      locationId: 1,
      eventDate: new Date().toISOString().slice(0, 10),
      secretAttributes: 'Small scratch under the lid'
    });
    expect(report.status).toBe(201);
    expect(report.body.data.report.privateDetails.secretAttributes).toBe('Small scratch under the lid');
    await repository.updateReport(report.body.data.report.id, { status: 'APPROVED' });
    const results = await request(app).get('/api/v1/reports/search').query({ q: 'bottle', reportType: 'FOUND' });
    expect(results.status).toBe(200);
    expect(results.body.data.reports).toHaveLength(1);
    expect(results.body.data.reports[0].privateDetails).toBeUndefined();
  });

  it('accepts a claim and limits claim verification to administrators', async () => {
    const reporter = request.agent(app);
    const claimant = request.agent(app);
    const reporterRegister = await reporter.post('/api/v1/auth/register').send({
      fullName: 'Item Reporter',
      email: `reporter-${Date.now()}@example.edu`,
      password: 'a-strong-password'
    });
    const claimantRegister = await claimant.post('/api/v1/auth/register').send({
      fullName: 'Item Claimant',
      email: `claimant-${Date.now()}@example.edu`,
      password: 'a-strong-password'
    });
    expect(reporterRegister.status).toBe(201);
    expect(claimantRegister.status).toBe(201);
    const created = await reporter.post('/api/v1/reports').send({
      reportType: 'FOUND', title: 'Found silver keys',
      publicDescription: 'Silver keys found near the sports ground.',
      categoryId: 3, locationId: 5, eventDate: new Date().toISOString().slice(0, 10),
      secretAttributes: 'One green key tag'
    });
    await repository.updateReport(created.body.data.report.id, { status: 'APPROVED' });
    const claim = await claimant.post(`/api/v1/reports/${created.body.data.report.id}/claims`).send({
      identifyingDetails: 'The ring includes a green key tag.'
    });
    expect(claim.status).toBe(201);
    const claims = await claimant.get('/api/v1/claims/mine');
    expect(claims.body.data.claims).toHaveLength(1);
    expect(claims.body.data.claims[0].identifyingDetails).toBe('The ring includes a green key tag.');
  });
});
